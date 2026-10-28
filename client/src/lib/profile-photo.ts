type UserPhotos = {
  profileImageUrl?: string | null;
  photos?: readonly { url?: string | null }[] | null;
};

export function hasProfilePhoto(user: UserPhotos | null | undefined): boolean {
  return Boolean(
    user?.profileImageUrl?.trim() ||
    user?.photos?.some((photo) => Boolean(photo.url?.trim())),
  );
}