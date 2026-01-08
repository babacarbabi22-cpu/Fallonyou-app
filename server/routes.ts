
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerObjectStorageRoutes(app);

  app.use("/uploads", express.static("uploads"));

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getPotentialMatches(req.user!.id);
    const enriched = await Promise.all(users.map(async u => {
      const profile = await storage.getProfile(u.id);
      const photos = await storage.getPhotos(u.id);
      return { ...u, profile: profile || null, photos };
    }));
    res.json(enriched);
  });

  app.patch(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.users.updateProfile.input.parse(req.body);
    const updated = await storage.upsertProfile(req.user!.id, input);
    res.json(updated);
  });

  // Photos
  app.post(api.photos.upload.path, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).send("No file uploaded");
    
    const url = `/uploads/${req.file.filename}`;
    const photo = await storage.createPhoto({
      userId: req.user!.id,
      url: url,
      type: 'image'
    });
    res.status(201).json(photo);
  });

  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deletePhoto(Number(req.params.id));
    res.sendStatus(204);
  });

  // Matches
  app.post(api.matches.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { targetUserId } = api.matches.create.input.parse(req.body);
    const match = await storage.createMatch(req.user!.id, targetUserId);
    
    if (match && match.status === 'matched') {
       res.json(match);
    } else {
       res.json(null);
    }
  });

  app.get(api.matches.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const matches = await storage.getMatches(req.user!.id);
    
    const enriched = await Promise.all(matches.map(async m => {
      const otherId = m.user1Id === req.user!.id ? m.user2Id : m.user1Id;
      const otherUser = await storage.getUser(otherId);
      const profile = await storage.getProfile(otherId);
      const photos = await storage.getPhotos(otherId);
      return { 
        ...m, 
        otherUser: { ...otherUser!, profile: profile || null, photos } 
      };
    }));
    
    res.json(enriched);
  });

  // Ratings
  app.post(api.ratings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.ratings.create.input.parse(req.body);
    const rating = await storage.createRating({
      ...input,
      raterId: req.user!.id
    });
    res.status(201).json(rating);
  });

  return httpServer;
}
