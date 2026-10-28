import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-danceme";
import { nativePushController } from "@/lib/native-push";

export function NativePushBridge() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const [, navigate] = useLocation();
  useEffect(() => {
    nativePushController?.setNavigate(navigate);
    if (!isLoading && !isError) void nativePushController?.setUser(user?.id ?? null).catch(() => {});
  }, [user?.id, isLoading, isError, navigate]);
  return null;
}
