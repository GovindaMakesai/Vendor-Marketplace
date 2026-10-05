import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as loginRequest, register as registerRequest } from "../api/auth";
import { TOKEN_KEY } from "../api/client";
import type { User } from "../types";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: fetchMe,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (token && meQuery.isError) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.clear();
    }
  }, [token, meQuery.isError, queryClient]);

  const persist = useCallback(
    (nextToken: string, user: User) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      queryClient.setQueryData(["me", nextToken], { user });
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await loginRequest(input);
      persist(result.token, result.user);
    },
    [persist],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const result = await registerRequest(input);
      persist(result.token, result.user);
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: meQuery.data?.user,
      isLoading: Boolean(token) && meQuery.isLoading,
      login,
      register,
      logout,
    }),
    [token, meQuery.data, meQuery.isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
