import { Storage, File } from "@google-cloud/storage";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { sanitizeUploadedImage } from "../../imagePrivacy";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
  ACL_POLICY_METADATA_KEY,
} from "./objectAcl";
import {
  ALLOWED_IMAGE_TYPES,
  ImageUploadMetadata,
  createImageUploadTicket,
  createImageUploadProof,
  hasValidRasterImageSignature,
  ImageUploadClaims,
  isOwnedCompletedImageUpload,
  isPrivateUploadObjectPath,
  MAX_IMAGE_UPLOAD_BYTES,
  verifyImageUploadProof,
  verifyImageUploadTicket,
  IMAGE_UPLOAD_TICKET_TTL_MS,
  validateImageUploadMetadata,
} from "./mediaSecurity";
import { createStoryUploadProof, prepareStoryMedia, verifyStoryUploadProof } from "../../storyMediaSecurity";
import { streamStoryObject } from "../../streamStoryObject";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, req?: Request, story = false) {
    if (story && req) return streamStoryObject(file, req, res);
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      const contentType = String(metadata.contentType || "").toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(contentType) || Number(metadata.size) <= 0 || Number(metadata.size) > MAX_IMAGE_UPLOAD_BYTES) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      // Set appropriate headers
      res.set({
        "Content-Type": contentType,
        "Content-Length": metadata.size,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      });

      if (req?.method === "HEAD") { res.end(); return; }
      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async writeOwnedStoryUpload(
    owner: string, bytes: Buffer, declaredType: string, secret: string,
    lifecycle: { record: (owner: string, path: string) => Promise<void>; finish: (owner: string, path: string) => Promise<void> },
  ): Promise<string> {
    if (!owner || !secret) throw new Error("Secure story upload is unavailable");
    const prepared = await prepareStoryMedia(bytes, declaredType);
    const objectPath = `/objects/uploads/${randomUUID()}`;
    const identity = { owner, objectPath, contentType: prepared.contentType, size: prepared.bytes.length };
    const policy: ObjectAclPolicy = {
      owner, contentType: identity.contentType, size: identity.size,
      visibility: "private", mediaClass: "story",
      uploadProof: createStoryUploadProof(identity, secret),
    };
    const file = this.getObjectEntityFileHandle(objectPath);
    await lifecycle.record(owner, objectPath);
    // Bytes, private ownership and proof are committed together. A restart
    // cannot leave an uploaded story with only process-local ownership.
    await file.save(prepared.bytes, {
      resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: identity.contentType, metadata: { [ACL_POLICY_METADATA_KEY]: JSON.stringify(policy) } },
    });
    await lifecycle.finish(owner, objectPath);
    return objectPath;
  }

  async ownsDurableStoryReference(owner: string, objectPath: string, secret: string) {
    if (!isPrivateUploadObjectPath(objectPath)) return false;
    let file: File;
    try { file = await this.getObjectEntityFile(objectPath); }
    catch (error) {
      if (error instanceof ObjectNotFoundError) return false;
      throw error;
    }
    const policy = await getObjectAclPolicy(file);
    const [metadata] = await file.getMetadata();
    return policy?.owner === owner && this.isVerifiedUploadPolicy(policy, objectPath, secret) &&
      ALLOWED_IMAGE_TYPES.has(policy.contentType || "") &&
      policy.size === Number(metadata.size) && policy.contentType === String(metadata.contentType || "").toLowerCase();
  }

  // Creates a stateless allocation. No storage entity exists until the bounded
  // same-origin PUT handler has authenticated and validated the complete body.
  getObjectEntityUploadURL(
    owner: string,
    uploadMetadata: ImageUploadMetadata,
    secret: string,
  ): { uploadURL: string; objectPath: string } {
    if (!owner || !secret || typeof uploadMetadata.size !== "number" || typeof uploadMetadata.contentType !== "string") {
      throw new Error("Invalid upload allocation");
    }
    if (validateImageUploadMetadata(uploadMetadata)) throw new Error("Invalid image upload metadata");
    const objectId = randomUUID();
    const objectPath = `/objects/uploads/${objectId}`;
    const claims: ImageUploadClaims = {
      version: 1,
      userId: owner,
      objectPath,
      contentType: uploadMetadata.contentType.toLowerCase(),
      size: uploadMetadata.size,
      expiresAt: Date.now() + IMAGE_UPLOAD_TICKET_TTL_MS,
    };
    const ticket = createImageUploadTicket(claims, secret);
    const uploadURL = `/api/uploads/${objectId}?ticket=${encodeURIComponent(ticket)}`;
    return { uploadURL, objectPath };
  }

  async writeOwnedImageUpload(
    claims: ImageUploadClaims,
    bytes: Buffer,
    secret: string,
  ): Promise<void> {
    if (
      !verifyImageUploadTicket(
        createImageUploadTicket(claims, secret),
        secret,
      ) ||
      claims.size !== bytes.length ||
      !hasValidRasterImageSignature(bytes, claims.contentType)
    ) {
      throw new Error("Invalid image upload");
    }
    const sanitized = await sanitizeUploadedImage(bytes, claims.contentType);
    const storedClaims = { ...claims, size: sanitized.length };
    const file = this.getObjectEntityFileHandle(claims.objectPath);
    const proof = createImageUploadProof(storedClaims, secret);
    const aclPolicy: ObjectAclPolicy = {
      owner: claims.userId,
      visibility: "private",
      contentType: claims.contentType,
      size: storedClaims.size,
      uploadProof: proof,
    };
    let objectSaved = false;
    try {
      await file.save(sanitized, {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: { contentType: claims.contentType },
      });
      objectSaved = true;
      await setObjectAclPolicy(file, aclPolicy);
    } catch (error) {
      // A metadata failure must not leave an object that could be mistaken for
      // an authorized completed upload.
      if (objectSaved) await file.delete({ ignoreNotFound: true }).catch(() => {});
      throw error;
    }
  }

  isVerifiedUploadPolicy(policy: ObjectAclPolicy | null, objectPath: string, secret: string): boolean {
    if (policy?.mediaClass === "story") {
      return policy.visibility === "private" && verifyStoryUploadProof({
        owner: policy.owner, objectPath, contentType: policy.contentType!,
        size: policy.size!, proof: policy.uploadProof!,
      }, secret);
    }
    return !!policy &&
      typeof policy.owner === "string" &&
      typeof policy.contentType === "string" &&
      typeof policy.size === "number" &&
      typeof policy.uploadProof === "string" &&
      policy.visibility === "private" &&
      verifyImageUploadProof({
        owner: policy.owner,
        objectPath,
        contentType: policy.contentType,
        size: policy.size,
        proof: policy.uploadProof,
      }, secret);
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    const objectFile = this.getObjectEntityFileHandle(objectPath);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async getOwnedCompletedUpload(userId: string, objectPath: string, secret: string): Promise<File | null> {
    if (!isPrivateUploadObjectPath(objectPath)) return null;
    let file: File;
    try {
      file = await this.getObjectEntityFile(objectPath);
      const [metadata] = await file.getMetadata();
      const policy = await getObjectAclPolicy(file);
      if (!isOwnedCompletedImageUpload({
        userId,
        objectPath,
        storedSize: Number(metadata.size),
        storedContentType: String(metadata.contentType || "").toLowerCase(),
        policy,
        secret,
      })) return null;
      return file;
    } catch {
      return null;
    }
  }

  async deleteOwnedPrivateUpload(userId: string, objectPath: string, secret: string): Promise<"deleted" | "missing" | "ownership_unverified"> {
    if (!isPrivateUploadObjectPath(objectPath)) return "ownership_unverified";
    const file = this.getObjectEntityFileHandle(objectPath);
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (error) {
      if ((error as { code?: number }).code === 404) {
        const [bucketExists] = await file.bucket.exists();
        if (bucketExists) return "missing";
        throw new Error("Configured media bucket is unavailable");
      }
      throw error; // Provider failures must be retried, not mistaken for absence.
    }
    let policy: ObjectAclPolicy | null;
    try {
      const raw = metadata.metadata?.["custom:aclPolicy"];
      policy = typeof raw === "string" ? JSON.parse(raw) : null;
    } catch { return "ownership_unverified"; }
    const ownedStory = policy?.mediaClass === "story" && policy.owner === userId &&
      policy.size === Number(metadata.size) && policy.contentType === String(metadata.contentType || "").toLowerCase() &&
      this.isVerifiedUploadPolicy(policy, objectPath, secret);
    if (!(ownedStory || isOwnedCompletedImageUpload({
      userId, objectPath, storedSize: Number(metadata.size),
      storedContentType: String(metadata.contentType || "").toLowerCase(), policy, secret,
    })) || !metadata.generation || !metadata.metageneration) return "ownership_unverified";
    // Never delete an object replaced/changed after ownership was checked.
    await file.delete({
      ignoreNotFound: true,
      ifGenerationMatch: metadata.generation,
      ifMetagenerationMatch: metadata.metageneration,
    });
    return "deleted";
  }

  private getObjectEntityFileHandle(objectPath: string): File {
    if (!isPrivateUploadObjectPath(objectPath)) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const { bucketName, objectName } = parseObjectPath(`${entityDir}${entityId}`);
    return objectStorageClient.bucket(bucketName).file(objectName);
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
