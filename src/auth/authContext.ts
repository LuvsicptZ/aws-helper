import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
