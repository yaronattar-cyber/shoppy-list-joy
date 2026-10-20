import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { scanReceipt } from "@/lib/ai/scan-receipt.functions";
import { VISION_QUOTA_MESSAGE } from "@/lib/ai/vision-errors";
import { matchReceiptItem, monthlyExpenses, receiptSchema, type Receipt } from "@/lib/receipts";
import type { ShoppingItem } from "@/lib/shopping-list";

async function imageData(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("לא ניתן לקרוא את התמונה");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.8);
    if (image.length > 1_500_000) throw new Error("התמונה גדולה מדי, נסו צילום קטן יותר");
    return image;
  } finally { bitmap.close(); }
}
type Props = { familyId: string; items: ShoppingItem[]; storeId?: string | null; onSaved: () => Promise<void> };
export function ReceiptScanner({ familyId, items, storeId, onSaved }: Props) {
  const scan = useServerFn(scanReceipt);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [image, setImage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [matches, setMatches] = useState<(string | null)[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [summaryError, setSummaryError] = useState(false);
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null);
  const now = new Date(), month = now.toLocaleDateString("sv-SE").slice(0, 7);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("sv-SE");
  const refresh = async () => {
    const { data, error } = await supabase.from("expenses").select("purchase_date,total_amount,currency").eq("family_id", familyId).gte("purchase_date", `${month}-01`).lt("purchase_date", nextMonth);
    setSummaryError(!!error);
    if (!error) setTotals(monthlyExpenses(data ?? [], month));
  };
  useEffect(() => {
    setTotals({}); void refresh();
    const { data: auth } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => void refresh(), 0); });
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { auth.subscription.unsubscribe(); window.removeEventListener("focus", focus); };
  }, [familyId, month]);
  const pick = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setReceipt(null);
    try {
      const img = await imageData(file); setImage(img);
      const result = await scan({ data: { image: img } });
      if (!result.result) { toast.error(result.error ?? VISION_QUOTA_MESSAGE); return; }
      setReceipt(result.result);
      setMatches(result.result.items.map((line) => matchReceiptItem(line.name, items, storeId)));
    } catch (e) { toast.error(e instanceof Error ? e.message : VISION_QUOTA_MESSAGE); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!receipt || busy) return;
    const checked = receiptSchema.safeParse(receipt);
    if (!checked.success) { toast.error("בדקו את התאריך, הכמויות והסכומים"); return; }
    setBusy(true);
    try {
      const blob = await (await fetch(image)).blob();
      const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      const path = `${familyId}/${hash}.jpg`;
      const upload = await supabase.storage.from("receipts").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) throw new Error("לא ניתן לשמור את תמונת החשבונית");
      const { error } = await supabase.rpc("save_receipt", { _id: crypto.randomUUID(), _family: familyId, _store: checked.data.store_name, _date: checked.data.purchase_date, _total: checked.data.total_amount, _currency: checked.data.currency, _path: path, _lines: checked.data.items.map((line, i) => ({ ...line, item_id: matches[i] ?? null })) });
      if (error) throw new Error("שמירת החשבונית נכשלה; ההוצאות והמחירים לא השתנו");
      await refresh(); await onSaved();
      toast.success("החשבונית נשמרה והמחירים עודכנו");
      setOpen(false); setReceipt(null); setImage("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "שמירת החשבונית נכשלה"); }
    finally { setBusy(false); }
  };
  const money = (amount: number, currency: string) => new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(amount);
  return <section aria-label="הוצאות חודשיות" className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm sm:px-6">
    <div className="flex min-w-0 flex-wrap gap-2"><span className="text-muted-foreground">הוצאות החודש</span><strong>{summaryError ? "לא ניתן לטעון" : Object.keys(totals).length ? Object.entries(totals).map(([currency, value]) => money(value, currency)).join(" · ") : money(0, "ILS")}</strong></div>
    <Button variant="ghost" size="sm" onClick={() => { setReceipt(null); setImage(""); setOpen(true); }}><ReceiptText className="h-4 w-4" />סרוק חשבונית</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>סריקת חשבונית</DialogTitle><DialogDescription>{receipt ? "אישור פרטי הרכישה" : "צילום או בחירת חשבונית"}</DialogDescription></DialogHeader>
        {!receipt && <div className="flex gap-2"><Button disabled={busy} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" />צילום</Button><Button disabled={busy} variant="outline" onClick={() => gallery.current?.click()}><ImagePlus className="h-4 w-4" />העלאה מהגלריה</Button></div>}
        {image && <img src={image} alt="החשבונית שנבחרה" className="mx-auto max-h-48 object-contain" />}
        {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{receipt ? "שומר חשבונית..." : "סורק חשבונית..."}</p>}
        {receipt && <>
          <label className="grid gap-1 text-sm">חנות<input aria-label="חנות בחשבונית" disabled={busy} value={receipt.store_name} onChange={(e) => setReceipt({ ...receipt, store_name: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-sm">תאריך רכישה<input aria-label="תאריך רכישה" type="date" disabled={busy} value={receipt.purchase_date} onChange={(e) => setReceipt({ ...receipt, purchase_date: e.target.value })} className="h-9 min-w-0 rounded-md border border-input bg-background px-2" /></label><label className="grid gap-1 text-sm">סכום ששולם<input aria-label="סכום ששולם" type="number" min="0" step="0.01" disabled={busy} value={receipt.total_amount} onChange={(e) => setReceipt({ ...receipt, total_amount: Number(e.target.value) })} className="h-9 min-w-0 rounded-md border border-input bg-background px-2" /></label></div>
          <label className="grid gap-1 text-sm">מטבע<input aria-label="מטבע" maxLength={3} disabled={busy} value={receipt.currency} onChange={(e) => setReceipt({ ...receipt, currency: e.target.value.toUpperCase() })} className="h-9 rounded-md border border-input bg-background px-2" /></label>
          <ul className="space-y-3">{receipt.items.map((line, i) => <li key={i} className="border-b border-border pb-2 text-sm">
            <p className="break-words font-medium">{line.name}</p>
            <div className="my-1 grid grid-cols-2 gap-2"><label>כמות<input aria-label={`כמות ${line.name}`} type="number" min="0.01" step="any" disabled={busy} value={line.quantity} onChange={(e) => setReceipt({ ...receipt, items: receipt.items.map((v, n) => n === i ? { ...v, quantity: Number(e.target.value) } : v) })} className="h-8 w-full rounded-md border border-input bg-background px-2" /></label><label>מחיר ליחידה<input aria-label={`מחיר ליחידה ${line.name}`} type="number" min="0" step="0.01" disabled={busy} value={line.unit_price} onChange={(e) => setReceipt({ ...receipt, items: receipt.items.map((v, n) => n === i ? { ...v, unit_price: Number(e.target.value) } : v) })} className="h-8 w-full rounded-md border border-input bg-background px-2" /></label></div>
            <select aria-label={`שיוך ${line.name}`} disabled={busy} value={matches[i] ?? ""} onChange={(e) => setMatches(matches.map((v, n) => n === i ? e.target.value || null : v))} className="h-9 w-full rounded-md border border-input bg-background px-2"><option value="">ללא שיוך מוצר</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.archived ? "מלאי" : "רשימה"}</option>)}</select>
          </li>)}</ul>
          <Button disabled={busy} onClick={() => void save()}>אישור ושמירת חשבונית</Button>
        </>}
        <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={gallery} hidden type="file" accept="image/*" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      </DialogContent>
    </Dialog>
  </section>;
}
