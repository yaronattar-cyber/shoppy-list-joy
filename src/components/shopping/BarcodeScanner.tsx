import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (name: string) => void;
};

// זיהוי ברקוד דרך BarcodeDetector המובנה בדפדפן (ללא תלות חיצונית)
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

// חיפוש שם מוצר לפי ברקוד במאגר הפתוח Open Food Facts
async function lookupProduct(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_he,brands`);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.product;
    if (data?.status !== 1 || !p) return null;
    const name: string = p.product_name_he || p.product_name || "";
    if (!name) return null;
    return p.brands ? `${name} (${p.brands.split(",")[0].trim()})` : name;
  } catch {
    return null;
  }
}

export function BarcodeScanner({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"scanning" | "loading" | "error">("scanning");
  const [message, setMessage] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!open) return;
    if (!supported) {
      setStatus("error");
      setMessage("הדפדפן אינו תומך בסריקת ברקוד. נסו בכרום או באנדרואיד.");
      return;
    }
    let cancelled = false;
    let raf = 0;
    setStatus("scanning");
    setMessage(null);

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new window.BarcodeDetector!({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              setStatus("loading");
              setMessage("מזהה מוצר...");
              const name = await lookupProduct(raw);
              if (cancelled) return;
              if (name) {
                onResult(name);
                onClose();
                return;
              }
              setStatus("error");
              setMessage(`לא נמצא מוצר עבור ברקוד ${raw} — אפשר לסרוק שוב או להוסיף ידנית`);
              setTimeout(() => { if (!cancelled) { setStatus("scanning"); setMessage(null); } }, 2500);
            }
          } catch { /* פריים בודד נכשל — ממשיכים */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("לא ניתן לגשת למצלמה — בדקו שההרשאה אושרה");
        }
      }
    };
    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, supported, onClose, onResult]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="סריקת ברקוד" className="fixed inset-0 z-50 flex flex-col bg-foreground/90 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <p className="font-semibold text-background">סריקת ברקוד</p>
        <Button type="button" size="icon" variant="secondary" onClick={onClose} aria-label="סגירת הסורק" className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16">
        {supported ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-background/40 shadow-soft">
            <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
            {/* מסגרת כיוון */}
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-primary/80" aria-hidden />
            {status === "loading" && (
              <div className="absolute inset-0 grid place-items-center bg-foreground/50">
                <Loader2 className="h-10 w-10 animate-spin text-background" />
              </div>
            )}
          </div>
        ) : (
          <Camera className="h-16 w-16 text-background/60" aria-hidden />
        )}
        <p className="max-w-xs text-center text-sm text-background/90">
          {message ?? "כוונו את המצלמה אל הברקוד שעל המוצר"}
        </p>
      </div>
    </div>
  );
}
