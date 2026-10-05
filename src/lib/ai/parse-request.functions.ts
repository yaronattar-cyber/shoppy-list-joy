// פירוק בקשת קנייה חופשית לפריטים באמצעות Lovable AI Gateway (צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

const UNITS = ["", "יח׳", "ק״ג", "גרם", "ליטר", "חבילה", "בקבוק", "קרטון"];

export type AiItem = { name: string; quantity: number; unit: string };

export const parseShoppingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ items: AiItem[]; error?: string }> => {
    if (!(await consumeAiQuota(context.supabase))) return { items: [], error: RATE_LIMIT_MSG };
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { items: [], error: "שירות ה-AI אינו מוגדר" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const system = `אתה מפרק בקשת קניות בעברית לרשימת מוצרים. החזר JSON בלבד בפורמט {"items":[{"name":"...","quantity":1,"unit":""}]}.
name: שם מוצר קצר בעברית ללא כמות. quantity: מספר חיובי. unit אחד מ: ${UNITS.map((u) => `"${u}"`).join(", ")} ("" אם אין יחידה).
התעלם ממילים שאינן מוצרים. אל תמציא מוצרים. מקסימום 40 פריטים.`;
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system,
        prompt: data.text,
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const text = await result.text;
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const items: AiItem[] = (Array.isArray(json.items) ? json.items : [])
        .map((i: any) => ({
          name: String(i?.name ?? "").trim().slice(0, 80),
          quantity: Number(i?.quantity) > 0 ? Math.min(Number(i.quantity), 999) : 1,
          unit: UNITS.includes(i?.unit) ? i.unit : "",
        }))
        .filter((i: AiItem) => i.name)
        .slice(0, 40);
      return { items };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { items: [], error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { items: [], error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("parseShoppingRequest failed", e);
      return { items: [], error: "לא הצלחנו לפרק את הבקשה, נסו שוב" };
    }
  });
