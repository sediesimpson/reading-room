import type { Profile, RoomMember } from "@/lib/types";

// Fired after you create, join, switch or leave a room, so the header and
// the page you're on can reload.
export const ROOM_CHANGED = "room-changed";

// The profiles of everyone who's a member of the given room, you included.
export function membersOf(
  roomId: string | null | undefined,
  profiles: Profile[],
  memberships: RoomMember[]
) {
  const ids = new Set(memberships.filter((m) => m.group_id === roomId).map((m) => m.user_id));
  return profiles.filter((profile) => ids.has(profile.user_id));
}
