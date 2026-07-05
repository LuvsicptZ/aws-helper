import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "./supabaseClient";
import { AuthContext } from "./authContext";

const PASSWORD_RECOVERY_STORAGE_KEY = "aws-mastery:password-recovery";

function readPasswordRecoveryState() {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "true";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabaseClient));
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    readPasswordRecoveryState,
  );

  const completePasswordRecovery = useCallback(() => {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    setIsPasswordRecovery(false);
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;

    void supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "true");
        setIsPasswordRecovery(true);
      }

      if (event === "SIGNED_OUT") {
        completePasswordRecovery();
      }

      setSession(nextSession);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, [completePasswordRecovery]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      isPasswordRecovery,
      completePasswordRecovery,
    }),
    [completePasswordRecovery, isLoading, isPasswordRecovery, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
