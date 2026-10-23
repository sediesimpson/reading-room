// One row of the links table.
export type Link = {
  id: number;
  url: string;
  created_at: string;
};

// One row of the daily_picks table.
export type DailyPick = {
  id: number;
  link_id: number;
  pick_date: string;
  spun_at: string;
};

// One row of the reads table: someone marked a link as read.
export type Read = {
  id: number;
  link_id: number;
  user_id: string | null;
  read_at: string;
};
