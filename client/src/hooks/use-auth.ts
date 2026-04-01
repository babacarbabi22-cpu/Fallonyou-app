import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  window.location.href = "/api/logout";
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
    termsAccepted: !!user?.termsAcceptedAt,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    confirmAge: confirmAgeMutation.mutate,
    isConfirmingAge: confirmAgeMutation.isPending,
  };
}
