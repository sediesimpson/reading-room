import { createBrowserClient } from "@supabase/ssr";

// Call this inside a "use client" component to talk to Supabase.
// In the browser it always hands back the same client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
