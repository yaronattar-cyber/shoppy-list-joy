import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventDetails, EventList } from "@/hooks/useEvents";
import type { Member } from "@/hooks/useFamilyMembers";

export function EventDetailsForm({ event, members, onSave, onCancel }: { event: EventList; members: Member[]; onSave: (title: string, details: EventDetails) => Promise<boolean>; onCancel: () => void }) {
  const [title, setTitle] = useState(event.name);
  const [details, setDetails] = useState<EventDetails>({ event_date: event.event_date ?? null, event_time: event.event_time ?? null, location: event.location ?? "", notes: event.notes ?? "", assigned_members: event.assigned_members ?? [], event_tasks: event.event_tasks ?? [] });
  const [saving, setSaving] = useState(false);
  const input = "mt-1 w-full min-w-0 rounded-md border border-input bg-card px-2 py-2 text-sm";
  const available = members.filter((m) => m.userId);
  return <form className="mt-3 space-y-3" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { if (await onSave(title, details)) onCancel(); } finally { setSaving(false); } }}>
    <label className="block text-sm">שם האירוע<input aria-label="שם האירוע" maxLength={100} className={input} value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
    <div className="grid grid-cols-2 gap-2">
      <label className="min-w-0 text-sm">תאריך<input aria-label="תאריך האירוע" type="date" className={input} value={details.event_date ?? ""} onChange={(e) => setDetails({ ...details, event_date: e.target.value || null })} /></label>
      <label className="min-w-0 text-sm">שעה<input aria-label="שעת האירוע" type="time" className={input} value={details.event_time?.slice(0, 5) ?? ""} onChange={(e) => setDetails({ ...details, event_time: e.target.value || null })} /></label>
    </div>
    <label className="block text-sm">מיקום<input aria-label="מיקום האירוע" maxLength={300} className={input} value={details.location} onChange={(e) => setDetails({ ...details, location: e.target.value })} /></label>
    <label className="block text-sm">הערות<textarea aria-label="הערות האירוע" maxLength={5000} className={input} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} /></label>
    <fieldset><legend className="mb-1 text-sm font-semibold">משתתפים</legend><div className="flex flex-wrap gap-3">{available.map((m) => <label key={m.userId} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={details.assigned_members.includes(m.userId ?? "")} onChange={(e) => { const id = m.userId; if (id) setDetails({ ...details, assigned_members: e.target.checked ? [...details.assigned_members, id] : details.assigned_members.filter((x) => x !== id) }); }} />{m.name}</label>)}</div></fieldset>
    <fieldset className="space-y-2"><legend className="text-sm font-semibold">משימות</legend>{details.event_tasks.map((task, index) => <div key={index} className="flex flex-wrap items-center gap-2">
      <input type="checkbox" aria-label={`השלמת משימה ${index + 1}`} checked={task.completed} onChange={(e) => setDetails({ ...details, event_tasks: details.event_tasks.map((t, i) => i === index ? { ...t, completed: e.target.checked } : t) })} />
      <input aria-label={`משימה ${index + 1}`} className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-2 text-sm" maxLength={200} value={task.title} required onChange={(e) => setDetails({ ...details, event_tasks: details.event_tasks.map((t, i) => i === index ? { ...t, title: e.target.value } : t) })} />
      <select aria-label={`אחראי משימה ${index + 1}`} className="max-w-full rounded-md border border-input bg-card p-2 text-sm" value={task.assignee} onChange={(e) => setDetails({ ...details, event_tasks: details.event_tasks.map((t, i) => i === index ? { ...t, assignee: e.target.value } : t) })}><option value="">ללא שיוך</option>{available.map((m) => <option key={m.userId} value={m.userId ?? ""}>{m.name}</option>)}</select>
      <Button type="button" size="icon" variant="ghost" aria-label={`מחיקת משימה ${index + 1}`} onClick={() => setDetails({ ...details, event_tasks: details.event_tasks.filter((_, i) => i !== index) })}><X className="h-4 w-4" /></Button>
    </div>)}<Button type="button" variant="outline" size="sm" disabled={details.event_tasks.length >= 50} onClick={() => setDetails({ ...details, event_tasks: [...details.event_tasks, { title: "", assignee: "", completed: false }] })}><Plus className="h-4 w-4" />משימה</Button></fieldset>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={saving || !title.trim()}>{saving ? "שומר..." : "שמירה"}</Button><Button type="button" size="sm" variant="ghost" onClick={onCancel}>ביטול</Button></div>
  </form>;
}