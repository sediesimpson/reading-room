// "Today" always means today in South Africa, matching spin() in the database.
const TIME_ZONE = "Africa/Johannesburg";

// e.g. "2026-10-23", the same format as daily_picks.pick_date.
export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

// e.g. "friday 23 october".
export function todayLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(new Date());
}
