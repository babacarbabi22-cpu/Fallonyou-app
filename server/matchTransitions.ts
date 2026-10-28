import type { Match } from "@shared/schema";

export class EndedMatchConnectionError extends Error {
  constructor() {
    super("This connection has ended and cannot be reopened");
    this.name = "EndedMatchConnectionError";
  }
}

export function resolveMatchTransition(
  user1Id: string,
  user2Id: string,
  existingRows: Match[],
): { action: "insert" } | { action: "return"; match: Match; isMatch: boolean } | { action: "accept"; match: Match } {
  const outgoing = existingRows.find(row => row.user1Id === user1Id && row.user2Id === user2Id);
  const incoming = existingRows.find(row => row.user1Id === user2Id && row.user2Id === user1Id);

  if (outgoing?.status === "matched" || incoming?.status === "matched") {
    return { action: "return", match: (outgoing?.status === "matched" ? outgoing : incoming)!, isMatch: true };
  }
  if (outgoing?.status === "pending") {
    return { action: "return", match: outgoing, isMatch: false };
  }
  if (existingRows.some(row => row.status === "ended")) {
    throw new EndedMatchConnectionError();
  }
  if (incoming?.status === "pending") {
    return { action: "accept", match: incoming };
  }
  return { action: "insert" };
}