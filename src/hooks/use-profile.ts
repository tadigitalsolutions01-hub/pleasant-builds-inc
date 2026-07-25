import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, getMyStats } from "@/lib/mws.functions";
import { useSession } from "./use-session";

export function useProfile() {
  const { userId, hydrated } = useSession();
  const fn = useServerFn(getMyProfile);
  return {
    ...useQuery({
      queryKey: ["profile", userId],
      queryFn: () => fn(),
      enabled: hydrated && !!userId,
      staleTime: 30_000,
    }),
    userId,
    hydrated,
  };
}

export function useStats() {
  const { userId, hydrated } = useSession();
  const fn = useServerFn(getMyStats);
  return useQuery({
    queryKey: ["stats", userId],
    queryFn: () => fn(),
    enabled: hydrated && !!userId,
    refetchInterval: 30_000,
  });
}
