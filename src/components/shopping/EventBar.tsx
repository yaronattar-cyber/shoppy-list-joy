import { useState } from "react";
import { LogOut, PartyPopper, Pencil, Share2, Trash2, X, Copy, CalendarDays } from "lucide-react";
import { EventDetailsForm } from "./EventDetailsForm";
import { eventIcs, googleCalendarLink } from "@/lib/event-calendar";
import type { EventDetails } from "@/hooks/useEvents";
import type { Member } from "@/hooks/useFamilyMembers";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { eventWhatsapp, type EventList } from "@/hooks/useEvents";

type Props = {
  familyId: string;
  userName?: string;
  active: EventList;
  joinedName: string | null;
  onClearJoined: () => void;
  onClose: (ev: EventList) => void;
  onRename: (ev: EventList, name: string) => Promise<boolean>;
  onExport: () => void;
  members: Member[];
  onSaveDetails: (ev: EventList, title: string, details: EventDetails) => Promise<boolean>;
};

// באנר אירוע פעיל: שיתוף בוואטסאפ וסגירה/עזיבה (הבחירה והיצירה בתפריט "חנויות ואירועים")
export function EventBar(p: Props) {
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // הגנה: אל תציג כלום אם אין אירוע פעיל (למשל בזמן טעינה)
  if (!p.active) return null;
  const isOwner = p.active.owner_family_id === p.familyId;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3 sm:px-6">
      {p.joinedName && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary animate-fade-in">
          🎉 הצטרפתם לרשימת האירוע: {p.joinedName}
          <button type="button" aria-label="סגירה" onClick={p.onClearJoined}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-accent px-3 py-2">
        <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{p.active.name}</p>
          <p className="text-xs text-muted-foreground">רשימה משותפת · קוד {p.active.id}</p>
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="שיתוף בוואטסאפ">
          <a href={eventWhatsapp(p.active, p.userName)} target="_blank" rel="noreferrer"><Share2 className="h-4 w-4" /></a>
        </Button>
        {isOwner && <Button type="button" variant="ghost" size="icon" aria-label="עריכת האירוע" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>}
        <Button type="button" variant="ghost" size="icon" aria-label={isOwner ? "סגירת האירוע" : "עזיבת האירוע"} onClick={() => setConfirm(true)} className="text-destructive">
          {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        </Button>
      </div>
      {editing && <EventDetailsForm key={p.active.id} event={p.active} members={p.members} onSave={(title, details) => p.onSaveDetails(p.active, title, details)} onCancel={() => setEditing(false)} />}
      {!editing && <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {(p.active.event_date || p.active.location) && <p>{p.active.event_date} {p.active.event_time?.slice(0, 5)} {p.active.location && `· ${p.active.location}`}</p>}
        {p.active.notes && <p className="whitespace-pre-wrap break-words">{p.active.notes}</p>}
        {!!p.active.assigned_members?.length && <p>משתתפים: {p.members.filter((m) => m.userId && p.active.assigned_members?.includes(m.userId)).map((m) => m.name).join(", ")}</p>}
        {p.active.event_tasks?.map((task, i) => <p key={i} className={task.completed ? "line-through" : ""}>{task.completed ? "✓" : "○"} {task.title} {task.assignee && `· ${p.members.find((m) => m.userId === task.assignee)?.name ?? "בן/בת משפחה"}`}</p>)}
      </div>}
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setCalendarOpen(!calendarOpen)}><CalendarDays className="h-4 w-4" />סנכרן ליומן</Button>
      {calendarOpen && <div className="mt-2 flex flex-wrap gap-2">{googleCalendarLink(p.active) ? <>
        <Button asChild variant="outline" size="sm"><a href={googleCalendarLink(p.active) ?? ""} target="_blank" rel="noopener noreferrer">Google Calendar</a></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => { const content = eventIcs(p.active); if (!content) return; const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `event-${p.active.id}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>יומן המכשיר</Button>
      </> : <p className="text-sm text-muted-foreground">יש לשמור תאריך לאירוע לפני הייצוא ליומן</p>}</div>}
      <Button type="button" variant="outline" size="sm" className="my-2 w-full" onClick={p.onExport}><Copy className="h-4 w-4" />יצוא לרשימת הקניות הכללית</Button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>{isOwner ? "לסגור ולמחוק את האירוע לכולם?" : "לעזוב את האירוע?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isOwner ? "הרשימה תימחק אצל כל המשפחות המשתתפות." : "הרשימה תוסר אצלכם בלבד; שאר המשפחות ימשיכו להשתמש בה."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => p.onClose(p.active)}>
              {isOwner ? "סגור אירוע" : "עזוב"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
