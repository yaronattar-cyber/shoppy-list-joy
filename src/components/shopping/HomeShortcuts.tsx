import { useState } from "react";
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, PartyPopper, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddTarget } from "./TargetPicker";

type Props = { targets: AddTarget[]; ids: string[]; onSort: (ids: string[]) => void; onSelect: (target: AddTarget) => void };
export function HomeShortcuts({ targets, ids, onSort, onSelect }: Props) {
  const [sorting, setSorting] = useState(false);
  const tabs = ids.flatMap((id) => { const target = targets.find((t) => t.id === id); return target ? [target] : []; });
  const move = (id: string | null, direction: number) => {
    if (!id) return;
    const index = ids.indexOf(id);
    const destination = ids[index + direction];
    if (!destination) return;
    const next = [...ids]; next[index] = destination; next[index + direction] = id; onSort(next);
  };
  if (!tabs.length) return null;
  return <nav aria-label="קיצורים מהירים" className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
    {tabs.map((tab, index) => <span key={tab.id} className="flex shrink-0 items-center gap-1">
      {sorting && <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} aria-label={`הזזת ${tab.label} ימינה`} onClick={() => move(tab.id, -1)}><ChevronRight className="h-4 w-4" /></Button>}
      <Button variant="outline" size="sm" className="max-w-48 rounded-full text-primary" onClick={() => onSelect(tab)} title={tab.label}>{tab.kind === "event" ? <PartyPopper /> : <Store />}<span className="truncate">{tab.label}</span></Button>
      {sorting && <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === tabs.length - 1} aria-label={`הזזת ${tab.label} שמאלה`} onClick={() => move(tab.id, 1)}><ChevronLeft className="h-4 w-4" /></Button>}
    </span>)}
    {tabs.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary" aria-label={sorting ? "סיום סידור קיצורים" : "סידור קיצורים"} onClick={() => setSorting(!sorting)}>{sorting ? <Check /> : <ArrowDownUp />}</Button>}
  </nav>;
}