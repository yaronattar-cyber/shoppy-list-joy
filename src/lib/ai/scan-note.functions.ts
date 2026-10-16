// סריקת פתק קניות (כתב יד/מודפס, עברית/אנגלית) לרשימת מוצרים — צד שרת בלבד
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

const schema = z.object({ items: z.array(z.string()) });

export const scanNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(1_500_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ items?: string[]; error?: string }> => {
    if (!(await consumeAiQuota(context.supabase))) return { error: RATE_LIMIT_MSG };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { createLovableAiGatewayProvider } = await import("./gateway-helpers.server");
    const { streamText, Output } = await import("ai");
    const provider = createLovableAiGatewayProvider(apiKey, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
    let streamError: unknown;
    try {
      const res = streamText({
        model: provider("google/gemini-3.8-flash"),
        system: "בתמונה פתק קניות בכתב יד או מודפס, בעברית או באנגלית. החזר JSON עם items: מערך שמות מוצרים קצרים, אחד לכל שורה בפתק, בשפה המקורית, כולל כמות אם נכתבה (למשל \"2 חלב\"). התעלם מכותרות ומחיקות. אם אין פתק החזר מערך ריק.",
        messages: [{ role: "user", content: [{ type: "text", text: "חלץ את פריטי הקנייה" }, { type: "image", image: new URL(data.image) }] }],
        output: Output.object({ schema }),
        maxRetries: 0,
        onError: ({ error }) => { streamError = error; },
      });
      const out = await res.output;
      const items = (out?.items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 60);
      if (!items.length) return { error: "לא זוהו פריטים בפתק, נסו תמונה ברורה יותר" };
      return { items };
    } catch (e) {
      const f = (streamError ?? e) as { statusCode?: number; status?: number; responseBody?: string; message?: string };
      const status = f.statusCode ?? f.status;
      let msg = f.message;
      if (f.responseBody) { try { const b = JSON.parse(f.responseBody); msg = b.error?.message ?? b.message ?? msg; } catch { /* not JSON */ } }
      if (status === 429) return { error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status && status >= 400) return { error: msg ?? "השירות אינו זמין כעת" };
      console.error("scanNote failed", e);
      return { error: "הסריקה נכשלה, נסו שוב" };
    }
  });
