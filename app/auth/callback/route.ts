import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// The magic link in the email lands here with a one-time ?code=...
// Swapping that code for a session saves the login in cookies.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  // Expired, already used, or opened in a different browser from the one
  // that asked for it.
  return NextResponse.redirect(`${origin}/login?error=link`);
}
