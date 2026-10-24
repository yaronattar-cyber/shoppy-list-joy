import type { z } from "zod";
import { visionErrorMessage } from "./vision-errors";

export class VisionError extends Error {
  constructor(public status?: number) { super(visionErrorMessage(status)); }
}

// Native Google REST streaming; callers supply the server-only key from their handler.
export async function geminiVision<S extends z.ZodType>(key: string, prompt: string, images: string[], schema: S): Promise<z.output<S>> {
  const parts = images.map((image) => {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
    if (!match?.[1] || !match[2]) throw new VisionError(400);
    return { inlineData: { mimeType: match[1], data: match[2] } };
  });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, ...parts] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!response.ok) { await response.body?.cancel(); throw new VisionError(response.status); }
  if (!response.body) throw new VisionError();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "";
  const frame = (value: string) => {
    const data = value.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data || data === "[DONE]") return;
    const chunk = JSON.parse(data);
    if (chunk.error) throw new VisionError(chunk.error.code);
    if (chunk.promptFeedback?.blockReason) throw new Error("Gemini לא יכול לנתח את התמונה הזו");
    for (const candidate of chunk.candidates ?? []) {
      if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(candidate.finishReason)) throw new Error("Gemini לא יכול לנתח את התמונה הזו");
      for (const part of candidate.content?.parts ?? []) if (!part.thought && part.text) text += part.text;
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) { frame(buffer.slice(0, end)); buffer = buffer.slice(end + 2); }
      if (done) break;
    }
    if (buffer.trim()) frame(buffer);
    return schema.parse(JSON.parse(text));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}