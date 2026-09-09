import { useCallback, useEffect, useRef, useState } from "react";

// זיהוי דיבור (STT) מבוסס Web Speech API בלבד — ללא תלות חיצונית
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechToText(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    setSupported(!!getCtor());
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("הדפדפן שלכם אינו תומך בזיהוי דיבור. נסו Chrome במחשב או באנדרואיד.");
      return;
    }
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      return;
    }
    setError(null);
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "he-IL";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const text = String(res[0]?.transcript ?? "").trim();
          if (text) finalRef.current(text);
        }
      }
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("ההרשאה למיקרופון נדחתה. אפשרו גישה למיקרופון בהגדרות הדפדפן.");
      } else if (code === "no-speech") {
        setError("לא זוהה דיבור. נסו שוב.");
      } else if (code === "audio-capture") {
        setError("לא נמצא מיקרופון במכשיר.");
      } else {
        setError("שגיאה בזיהוי הדיבור. נסו שוב.");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    try {
      rec.start();
      setListening(true);
    } catch {
      setError("לא ניתן להפעיל את המיקרופון כרגע.");
      setListening(false);
    }
  }, [listening]);

  return { supported, listening, error, start };
}
