type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export type SupabaseConfig =
  | { enabled: false }
  | { enabled: true; url: string; anonKey: string };

export function getSupabaseConfig(env: SupabaseEnv): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return { enabled: false };
  }

  return {
    enabled: true,
    url,
    anonKey,
  };
}
