import { useState } from "react";
import { inviteLink, whatsappInvite } from "@/lib/family";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_EMOJI, type Member } from "@/hooks/useFamilyMembers";

type Props = {
  familyId: string;
  userName: string;
  joinedFromLink: boolean;
  onRename: (name: string) => void;
  onJoin: (id: string) => Promise<void>;
  onCreate: () => Promise<string>;
  onBack: () => void;
  members: Member[];
  onSetRole: (name: string, role: string) => void;
};

const box = "rounded-lg border border-border bg-card p-5 shadow-sm";
const input =
  "min-w-0 flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";

// מסך 4 — ניהול המשפחה
export function FamilyScreen(p: Props) {
  const [name, setName] = useState(p.userName);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <section className="mx-auto w-full max-w-xl space-y-5 px-4 pb-28 pt-5 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">המשפחה שלי</h1>
      {p.joinedFromLink && (
        <p className="rounded-2xl bg-accent p-3 text-sm font-bold text-accent-foreground">
          הצטרפתם לקבוצה {p.familyId} דרך קישור הזמנה 🎉
        </p>
      )}

      <div className={box}>
        <p className="mb-3 font-bold text-foreground">בני המשפחה ({p.members.length})</p>
        <ul className="space-y-3">
          {p.members.map((m) => {
            const online = Date.now() - new Date(m.lastSeen).getTime() < 10 * 60 * 1000;
            return (
              <li key={m.name}>
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="text-xl">{ROLE_EMOJI[m.role] ?? "🙂"}</span>{m.name}{m.name === p.userName && <span className="text-xs text-muted-foreground">(אני)</span>}
                  <span className={cn("h-2 w-2 rounded-full", online ? "bg-primary" : "bg-muted-foreground/40")} title={online ? "פעיל לאחרונה" : "לא פעיל"} />
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <Button key={r} type="button" size="sm" variant={m.role === r ? "default" : "outline"} className="h-8 rounded-full px-3" onClick={() => p.onSetRole(m.name, m.role === r ? "" : r)}>{ROLE_EMOJI[r]} {r}</Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={box}>
        <p className="text-sm text-muted-foreground">קוד הקבוצה</p>
        <p className="mt-1 font-mono text-3xl font-bold text-foreground" dir="ltr">{p.familyId}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={whatsappInvite(p.familyId, p.userName)}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), "h-10")}
          >
            הזמנה בוואטסאפ
          </a>
          <Button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(inviteLink(p.familyId));
              setCopied(true);
            }}
            variant="outline"
          >
            {copied ? "הועתק ✓" : "העתקת קישור"}
          </Button>
        </div>
      </div>

      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) p.onRename(name);
        }}
      >
        <label className="text-sm font-semibold text-foreground" htmlFor="fam-name">השם שלי</label>
        <div className="mt-2 flex gap-2">
          <input id="fam-name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <Button type="submit" variant="outline">שמירה</Button>
        </div>
      </form>

      <form
        className={box}
        onSubmit={async (e) => {
          e.preventDefault();
          await p.onJoin(code);
          setCode("");
        }}
      >
        <label className="text-sm font-semibold text-foreground" htmlFor="fam-code">הצטרפות לקבוצה קיימת</label>
        <div className="mt-2 flex gap-2">
          <input
            id="fam-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="קוד בן 6 תווים"
            dir="ltr"
            className={input}
          />
          <Button type="submit">הצטרפות</Button>
        </div>
        <Button
          type="button"
          onClick={() => void p.onCreate()}
          variant="link"
          className="mt-3 px-0 text-sm text-muted-foreground"
        >
          או יצירת קבוצה חדשה
        </Button>
      </form>

      <Button type="button" onClick={p.onBack} variant="outline" className="w-full">
        חזרה לבית
      </Button>
    </section>
  );
}
