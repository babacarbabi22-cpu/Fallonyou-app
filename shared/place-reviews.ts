import { z } from "zod";

export const placeReviewInput = z.object({
  kind: z.enum(["hotel", "place"]),
  placeName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(10).max(1500),
  recommendation: z.string().trim().max(500).default(""),
  pastVisitConfirmed: z.literal(true),
}).strict();

export const placeReviewReportInput = z.object({
  reason: z.enum(["privacy", "spam", "misleading", "other"]),
  details: z.string().trim().max(500).default(""),
}).strict();

export type PlaceReviewInput = z.infer<typeof placeReviewInput>;
export type PlaceReviewReportInput = z.infer<typeof placeReviewReportInput>;
export type PlaceReviewItem = Omit<PlaceReviewInput, "pastVisitConfirmed"> & {
  id: number;
  placeKey: string;
  authorName: string;
  isOwner: boolean;
  hidden: boolean;
  reportedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  averageRating: number;
  ratingCount: number;
};
export type PlaceReviewPage = { reviews: PlaceReviewItem[]; nextCursor: number | null };
export type PlaceReviewReport = {
  id: number;
  reason: PlaceReviewReportInput["reason"];
  details: string;
  createdAt: string;
  review: PlaceReviewItem;
};

// Free-text community places, not a hotel supplier catalog or verified stays.
export function placeReviewKey(input: Pick<PlaceReviewInput, "kind" | "placeName" | "city" | "country">) {
  const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "")
    .trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return JSON.stringify([input.kind, input.placeName, input.city, input.country].map(normalize));
}
