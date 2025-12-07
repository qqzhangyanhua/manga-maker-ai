"use client";

import { useQuery } from "@tanstack/react-query";

export type CurrentUser = {
  id: number;
  email: string;
  name?: string | null;
  verified: boolean;
  role?: string | null;
  status?: string | null;
  created_at?: string;
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["current-user"],
    queryFn: async (): Promise<CurrentUser> => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("未登录");
      }
      const data = await res.json();
      return data.data.user as CurrentUser;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
