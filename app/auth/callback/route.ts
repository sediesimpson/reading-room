import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// The magic link in the email lands here with a one-time ?code=...
// Swapping that code for a session saves the login in cookies.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to go after logging in. Only paths on this site, never another site.
  const next = searchParams.get("next") ?? "/";
  const safeNext = /^\/(?![/\\])/.test(next) ? next : "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Expired, already used, or opened in a different browser from the one
  // that asked for it.
  return NextResponse.redirect(`${origin}/login?error=link`);
}
