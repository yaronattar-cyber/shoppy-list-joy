import type { EventList } from "@/hooks/useEvents";

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function calendarDates(event: EventList) {
  if (!event.event_date) return null;
  const date = event.event_date.replace(/-/g, "");
  if (!event.event_time) {
    const next = new Date(`${event.event_date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { start: date, end: next.toISOString().slice(0, 10).replace(/-/g, ""), allDay: true };
  }
  const start = new Date(`${event.event_date}T${event.event_time}`);
  if (Number.isNaN(start.getTime())) return null;
  const format = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { start: format(start), end: format(new Date(start.getTime() + 60 * 60 * 1000)), allDay: false };
}

export function googleCalendarLink(event: EventList) {
  const dates = calendarDates(event);
  if (!dates) return null;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: event.name, dates: `${dates.start}/${dates.end}`, location: event.location ?? "", details: event.notes ?? "" })}`;
}

export function eventIcs(event: EventList) {
  const dates = calendarDates(event);
  if (!dates) return null;
  const field = dates.allDay ? ";VALUE=DATE" : "";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Smart Shopping//Family Events//HE", "BEGIN:VEVENT", `UID:${event.id}@smart-shopping`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART${field}:${dates.start}`, `DTEND${field}:${dates.end}`, `SUMMARY:${escapeIcs(event.name)}`, `LOCATION:${escapeIcs(event.location ?? "")}`, `DESCRIPTION:${escapeIcs(event.notes ?? "")}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}