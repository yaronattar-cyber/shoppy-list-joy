import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type Category } from "@/lib/categories";

type Props = { onAdd: (name: string) => string | null };

// שורת קטגוריות קומפקטית ונגללת
export function CategoryBar({ onAdd }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      <div className="flex w-max flex-nowrap gap-2">
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
                className="w-72 rounded-lg border-border bg-card p-3 shadow-lg"
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
    <Button
      type="button"
      onClick={onClick}
      aria-label={cat.label}
      title={cat.label}
      {...rest}
      variant="outline"
      className="h-10 shrink-0 gap-2 rounded-full border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-sm active:scale-95"
    >
      <Icon className="h-4 w-4 text-primary" strokeWidth={2.25} aria-hidden />
      <span>{cat.label}</span>
    </Button>
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
      <p className="mb-2 text-base font-semibold text-foreground">{cat.label}</p>
      <div className="flex flex-col gap-1.5">
        {cat.options?.map((opt) => (
          <Button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            variant="ghost"
            className="h-10 justify-start rounded-md px-3 text-right text-base font-medium text-foreground"
          >
            {opt}
          </Button>
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
            className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            className="h-10 rounded-md px-3 text-sm font-semibold"
          >
            הוסף
          </Button>
        </form>
      )}
    </div>
  );
}
