import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  completePasswordRecovery: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  isPasswordRecovery: false,
  completePasswordRecovery: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
