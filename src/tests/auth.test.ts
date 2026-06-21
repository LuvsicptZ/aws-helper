import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "../auth/supabaseConfig";

describe("supabase config", () => {
  it("is disabled when url is missing", () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({ enabled: false });
  });

  it("is disabled when anon key is missing", () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toEqual({ enabled: false });
  });

  it("returns config when url and anon key are present", () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      enabled: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });
});
