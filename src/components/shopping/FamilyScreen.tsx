import { useState } from "react";
import { inviteLink, whatsappInvite } from "@/lib/family";

type Props = {
  familyId: string;
  userName: string;
  joinedFromLink: boolean;
  onRename: (name: string) => void;
  onJoin: (id: string) => Promise<void>;
  onCreate: () => Promise<string>;
  onBack: () => void;
};

const box = "rounded-3xl border-[3px] border-foreground bg-card p-5";
const input =
  "min-w-0 flex-1 rounded-2xl border-2 border-foreground bg-background px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
const btn = "rounded-2xl border-[3px] border-foreground px-4 py-2.5 text-sm font-black";

// מסך 4 — ניהול המשפחה
export function FamilyScreen(p: Props) {
  const [name, setName] = useState(p.userName);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <section className="mx-auto w-full max-w-xl space-y-5 px-5 pb-16 pt-10">
      <h1 className="text-3xl font-black text-foreground">המשפחה שלי</h1>
      {p.joinedFromLink && (
        <p className="rounded-2xl bg-accent p-3 text-sm font-bold text-accent-foreground">
          הצטרפתם לקבוצה {p.familyId} דרך קישור הזמנה 🎉
        </p>
      )}

      <div className={box}>
        <p className="text-sm text-muted-foreground">קוד הקבוצה</p>
        <p className="mt-1 font-mono text-3xl font-black tracking-widest text-foreground" dir="ltr">{p.familyId}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={whatsappInvite(p.familyId, p.userName)}
            target="_blank"
            rel="noreferrer"
            className={`${btn} bg-primary text-primary-foreground`}
          >
            הזמנה בוואטסאפ
          </a>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(inviteLink(p.familyId));
              setCopied(true);
            }}
            className={`${btn} bg-card text-foreground`}
          >
            {copied ? "הועתק ✓" : "העתקת קישור"}
          </button>
        </div>
      </div>

      <form
        className={box}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) p.onRename(name);
        }}
      >
        <label className="text-sm font-bold text-foreground" htmlFor="fam-name">השם שלי</label>
        <div className="mt-2 flex gap-2">
          <input id="fam-name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <button type="submit" className={`${btn} bg-card text-foreground`}>שמירה</button>
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
        <label className="text-sm font-bold text-foreground" htmlFor="fam-code">הצטרפות לקבוצה קיימת</label>
        <div className="mt-2 flex gap-2">
          <input
            id="fam-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="קוד בן 6 תווים"
            dir="ltr"
            className={input}
          />
          <button type="submit" className={`${btn} bg-primary text-primary-foreground`}>הצטרפות</button>
        </div>
        <button
          type="button"
          onClick={() => void p.onCreate()}
          className="mt-4 text-sm font-bold text-muted-foreground underline"
        >
          או יצירת קבוצה חדשה
        </button>
      </form>

      <button type="button" onClick={p.onBack} className={`${btn} w-full bg-card text-foreground`}>
        חזרה לבית
      </button>
    </section>
  );
}
