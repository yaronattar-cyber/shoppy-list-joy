import { useState } from "react";
import { LogOut, PartyPopper, Share2, Trash2, X } from "lucide-react";
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
};

// באנר אירוע פעיל: שיתוף בוואטסאפ וסגירה/עזיבה (הבחירה והיצירה בתפריט "חנויות ואירועים")
export function EventBar(p: Props) {
  const [confirm, setConfirm] = useState(false);
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
        <Button type="button" variant="ghost" size="icon" aria-label={isOwner ? "סגירת האירוע" : "עזיבת האירוע"} onClick={() => setConfirm(true)} className="text-destructive">
          {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        </Button>
      </div>

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
