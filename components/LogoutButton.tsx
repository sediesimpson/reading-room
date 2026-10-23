"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  // Nothing to log out of on the login page.
  if (usePathname() === "/login") return null;

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <button onClick={handleLogout} className="hover:text-ink">
      log out
    </button>
  );
}
