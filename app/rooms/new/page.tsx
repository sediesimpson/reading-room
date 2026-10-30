"use client";

import { useRouter } from "next/navigation";
import GroupSetup from "@/components/GroupSetup";

// "start a new room" from the room menu, for people already in a room.
export default function NewRoomPage() {
  const router = useRouter();
  return <GroupSetup onCreated={() => router.push("/")} />;
}
