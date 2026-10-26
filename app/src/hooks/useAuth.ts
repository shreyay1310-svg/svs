import { useCallback, useMemo } from "react";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const token = typeof window !== "undefined" ? localStorage.getItem("erp_token") : null;
  const hasToken = !!token;

  const {
    data: user,
    isPending,
    isFetching,
    error,
    isError,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: hasToken,
  });

  const logout = useCallback(() => {
    localStorage.removeItem("erp_token");
    utils.invalidate();
    window.location.reload();
  }, [utils]);

  // When no token, not loading (redirect immediately)
  // When has token and fetching, show loading
  // When has token and done, show content
  const isLoading = hasToken && (isPending || isFetching);
  const isAuthenticated = hasToken && !!user && !isError;

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated,
      isLoading,
      error,
      logout,
    }),
    [user, isAuthenticated, isLoading, error, logout]
  );
}
