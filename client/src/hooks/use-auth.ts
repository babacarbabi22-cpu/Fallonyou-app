import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { detachNativePushBeforeLogout } from "@/lib/native-push";

interface ExtendedUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  isPremium?: string | null;
  isVerified?: string | null;
  isAdmin?: string | null;
  isBanned?: string | null;
  location?: string | null;
  createdAt?: string | Date | null;
  ageConfirmed?: boolean;
  ageConfirmedAt?: string | Date | null;
  termsAcceptedAt?: string | Date | null;
  termsAcceptedVersion?: string | null;
  profile?: any;
  photos?: any[];
  [key: string]: any;
}

async function fetchUser(): Promise<ExtendedUser | null> {
  // Try the email auth endpoint first
  const response = await fetch("/api/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  await detachNativePushBeforeLogout();
  const response = await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }
}

async function confirmAge(): Promise<void> {
  const response = await fetch("/api/confirm-age", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to confirm age");
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<ExtendedUser | null>({
    queryKey: ["/api/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      window.location.assign("/?logged_out=1");
    },
  });

  const confirmAgeMutation = useMutation({
    mutationFn: confirmAge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    ageConfirmed: user?.ageConfirmed === true,
    // Existing members keep their prior acceptance; only members without one see the new terms.
    termsAccepted: !!user?.termsAcceptedAt,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    confirmAge: confirmAgeMutation.mutate,
    isConfirmingAge: confirmAgeMutation.isPending,
  };
}
