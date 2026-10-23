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

// e.g. "07:42", for a timestamp from the database.
export function timeLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(timestamp));
}

// e.g. "thursday 22 october" for a pick_date like "2026-10-22".
// The year is added when it isn't this year.
export function pickDateLabel(pickDate: string, today: string) {
  // Midday UTC, so the date can't slip to the day before or after.
  const date = new Date(`${pickDate}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: pickDate.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}
