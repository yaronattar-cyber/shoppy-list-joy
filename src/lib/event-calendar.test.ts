import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calendarDates, eventIcs, googleCalendarLink } from "./event-calendar";

const event = { id: "EVENT123", name: "אירוח", owner_family_id: "FAMILY", event_date: "2026-10-22", location: "הבית", notes: "ארוחה\nמשפחתית" };
describe("family event calendar export", () => {
  it("exports the selected date as one all-day event", () => {
    assert.deepEqual(calendarDates(event), { start: "20261022", end: "20261023", allDay: true });
  });
  it("includes title, location and notes in Google Calendar", () => {
    const url = new URL(googleCalendarLink(event) ?? "");
    assert.equal(url.searchParams.get("text"), "אירוח");
    assert.equal(url.searchParams.get("location"), "הבית");
    assert.equal(url.searchParams.get("details"), "ארוחה\nמשפחתית");
  });
  it("requires a date instead of inventing one", () => {
    assert.equal(eventIcs({ ...event, event_date: null }), null);
  });
  it("exports selected time as a one-hour event", () => {
    const dates = calendarDates({ ...event, event_time: "18:30" });
    assert.equal(dates?.allDay, false);
    assert.equal(dates?.start, new Date("2026-10-22T18:30").toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""));
  });
});