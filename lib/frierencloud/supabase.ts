import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://placeholder.invalid";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "placeholder";
const isBrowser = typeof window !== "undefined";

const browserStorage = {
  getItem: async (key: string) => (isBrowser ? window.localStorage.getItem(key) : null),
  setItem: async (key: string, value: string) => {
    if (isBrowser) window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isBrowser) window.localStorage.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: browserStorage,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: false,
  },
});
