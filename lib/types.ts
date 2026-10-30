// One row of the links table.
export type Link = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  group_id: string;
  added_by: string;
  created_at: string;
};

// One row of the daily_picks table.
export type DailyPick = {
  id: number;
  link_id: number;
  pick_date: string;
  spun_at: string;
  group_id: string;
  spun_by: string | null;
};

// One row of the reads table: someone marked a link as read.
export type Read = {
  id: number;
  link_id: number;
  user_id: string;
  read_at: string;
};

// One row of the profiles table: your name and the room you're looking at.
export type Profile = {
  user_id: string;
  display_name: string;
  // Your current room (you can be a member of several).
  group_id: string | null;
};

// One row of the groups table: a reading room.
export type Group = {
  id: string;
  name: string;
  invite_code: string;
};

// One slice of the wheel from wheel_slices(): no url, no title.
export type WheelSlice = {
  id: number;
  added_by: string;
  created_at: string;
};

// One row of the room_members table: someone belongs to a room.
export type RoomMember = {
  group_id: string;
  user_id: string;
  joined_at: string;
};
