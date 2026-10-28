// Videos alone do not satisfy the profile-photo requirement.
export function hasProfilePhoto(user: {
  profileImageUrl?: string | null;
  photos?: { type?: string; url?: string | null }[];
} | null | undefined): boolean {
  return Boolean(user?.profileImageUrl?.trim() || user?.photos?.some(
    photo => photo.type === "image" && Boolean(photo.url?.trim()),
  ));
}
