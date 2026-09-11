import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORIES, type Category } from "@/lib/categories";

type Props = { onAdd: (name: string) => string | null };

// שורת קטגוריות אופקית נגללת — סטייל קומיקס: קו שחור עבה, צבע חזק, צל
export function CategoryBar({ onAdd }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="-mx-5 mt-7 overflow-x-auto px-5 pb-3">
      <div className="flex w-max flex-nowrap gap-4">
        {CATEGORIES.map((cat) =>
          cat.direct ? (
            <ComicButton key={cat.id} cat={cat} onClick={() => onAdd(cat.label)} />
          ) : (
            <Popover
              key={cat.id}
              open={openId === cat.id}
              onOpenChange={(o) => setOpenId(o ? cat.id : null)}
            >
              <PopoverTrigger asChild>
                <ComicButton cat={cat} />
              </PopoverTrigger>
              <PopoverContent
                align="center"
                dir="rtl"
                className="w-72 rounded-2xl border-[3px] border-foreground p-3 shadow-[6px_6px_0_0_var(--color-foreground)]"
              >
                <CategoryMenu
                  cat={cat}
                  onPick={(name) => {
                    // סגירה אוטומטית של תפריט המשנה מיד לאחר בחירה
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

function ComicButton({
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
      className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl border-[3px] border-foreground text-foreground shadow-[5px_5px_0_0_var(--color-foreground)] transition-all duration-150 hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${cat.color}`}
    >
      <Icon className="h-9 w-9" strokeWidth={2.5} aria-hidden />
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
      <p className="mb-2 text-base font-black text-foreground">{cat.label}</p>
      <div className="flex flex-col gap-1.5">
        {cat.options?.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className="rounded-xl border-2 border-transparent px-3 py-2 text-right text-base font-bold text-foreground transition-colors hover:border-foreground hover:bg-secondary"
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
            className="min-w-0 rounded-xl border-2 border-foreground bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-xl border-2 border-foreground bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95"
          >
            הוסף
          </button>
        </form>
      )}
    </div>
  );
}
