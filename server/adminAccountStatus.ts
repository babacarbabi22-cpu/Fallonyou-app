import { sql } from "drizzle-orm";
import { users, photos } from "@shared/schema";

// Select only presence flags, never credential values or private media details.
// This projection belongs exclusively to the administrator user-list endpoint.
export const adminAccountStatusColumns = {
  hasPassword: sql<boolean>`(${users.password} is not null and ${users.password} <> '')`,
  hasProfilePhoto: sql<boolean>`(
    coalesce(${users.profileImageUrl} ~ '[^[:space:]]', false)
    or exists (
      select 1 from ${photos}
      -- Explicit identifiers preserve correlation when Drizzle's single-table
      -- SELECT compiler otherwise strips Column table qualifiers.
      where ${photos}.${sql.identifier(photos.userId.name)} = ${users}.${sql.identifier(users.id.name)}
        and ${photos}.${sql.identifier(photos.type.name)} = ${"image"}
        and ${photos}.${sql.identifier(photos.url.name)} ~ '[^[:space:]]'
    )
  )`,
};
