import { describe, expect, it } from "vitest";
import { calendarDates, eventIcs, googleCalendarLink } from "./event-calendar";

const event = { id: "EVENT123", name: "אירוח", owner_family_id: "FAMILY", event_date: "2026-10-22", location: "הבית", notes: "ארוחה\nמשפחתית" };
describe("family event calendar export", () => {
  it("exports the selected date as one all-day event", () => {
    expect(calendarDates(event)).toEqual({ start: "20261022", end: "20261023", allDay: true });
  });
  it("includes title, location and notes in Google Calendar", () => {
    const url = new URL(googleCalendarLink(event) ?? "");
    expect(url.searchParams.get("text")).toBe("אירוח");
    expect(url.searchParams.get("location")).toBe("הבית");
    expect(url.searchParams.get("details")).toBe("ארוחה\nמשפחתית");
  });
  it("requires a date instead of inventing one", () => {
    expect(eventIcs({ ...event, event_date: null })).toBeNull();
  });
  it("exports selected time as a one-hour event", () => {
    const dates = calendarDates({ ...event, event_time: "18:30" });
    expect(dates?.allDay).toBe(false);
    expect(dates?.start).toBe(new Date("2026-10-22T18:30").toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""));
  });
});