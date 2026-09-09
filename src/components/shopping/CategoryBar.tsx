import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORIES, type Category } from "@/lib/categories";

type Props = { onAdd: (name: string) => boolean };

// שורת קטגוריות אופקית נגללת — אייקונים בלבד עם aria-label/tooltip
export function CategoryBar({ onAdd }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="-mx-5 mt-7 overflow-x-auto px-5 pb-2">
      <div className="flex w-max flex-nowrap gap-3">
        {CATEGORIES.map((cat) =>
          cat.direct ? (
            <IconButton key={cat.id} cat={cat} onClick={() => onAdd(cat.label)} />
          ) : (
            <Popover
              key={cat.id}
              open={openId === cat.id}
              onOpenChange={(o) => setOpenId(o ? cat.id : null)}
            >
              <PopoverTrigger asChild>
                <IconButton cat={cat} />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-64 p-3" dir="rtl">
                <CategoryMenu
                  cat={cat}
                  onPick={(name) => {
                    if (onAdd(name)) setOpenId(null);
                  }}
                />
              </PopoverContent>
            </Popover>
          ),
        )}
      </div>
    </div>
  );
}

function IconButton({
  cat,
  onClick,
  ...rest
}: { cat: Category; onClick?: () => void } & React.ComponentProps<"button">) {
  const { Icon } = cat;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={cat.label}
      title={cat.label}
      {...rest}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary active:scale-95"
    >
      <Icon className="h-7 w-7" aria-hidden />
    </button>
  );
}

function CategoryMenu({
  cat,
  onPick,
}: {
  cat: Category;
  onPick: (name: string) => void;
}) {
  const [custom, setCustom] = useState("");

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-foreground">{cat.label}</p>
      <div className="flex flex-col gap-1.5">
        {cat.options?.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className="rounded-xl px-3 py-2 text-right text-base font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {opt}
          </button>
        ))}
      </div>
      {cat.allowCustom && (
        <form
          className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!custom.trim()) return;
            onPick(custom);
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={cat.customPlaceholder ?? "פריט מותאם..."}
            aria-label={`פריט מותאם בקטגוריית ${cat.label}`}
            className="min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground active:scale-95"
          >
            הוסף
          </button>
        </form>
      )}
    </div>
  );
}
