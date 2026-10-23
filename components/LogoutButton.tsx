"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

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
