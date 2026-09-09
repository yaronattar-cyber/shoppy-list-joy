import { useCallback, useEffect, useRef, useState } from "react";

// הקראה בעברית (TTS) — לא חוסם UI, מונע הקראות כפולות/חופפות
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const hebrew = voices.filter(
        (v) => v.lang?.toLowerCase().startsWith("he") || /hebrew|ivrit/i.test(v.name),
      );
      if (!hebrew.length) return;
      const female = hebrew.find((v) =>
        /female|woman|carmit|shira|noa|נשי|כרמית/i.test(v.name),
      );
      voiceRef.current = female ?? hebrew[0] ?? null;
    };

    pickVoice();
    // רשימת הקולות נטענת לעיתים באיחור
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = useCallback(
    (text: string, options?: { once?: boolean }) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = text.trim();
      if (!clean) return;
      if (options?.once && lastRef.current === clean) return;
      lastRef.current = clean;
      try {
        window.speechSynthesis.cancel(); // מונע חפיפה
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = "he-IL";
        if (voiceRef.current) utter.voice = voiceRef.current;
        utter.rate = 1;
        window.speechSynthesis.speak(utter);
      } catch {
        // מתעלמים — ההקראה אינה קריטית
      }
    },
    [],
  );

  return { supported, speak };
}
