// עוזרת אישית למלאי: שאלות חופשיות על המלאי דרך Lovable AI Gateway (צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

export type AssistantItem = { name: string; quantity: number; unit: string; stockStatus: string; expiryDate: string };

export const askInventoryAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    question: z.string().trim().min(1).max(500),
    items: z.array(z.object({
      name: z.string().trim().min(1).max(80),
      quantity: z.number().min(0).max(9999),
      unit: z.string().max(20),
      stockStatus: z.string().max(20),
      expiryDate: z.string().max(20),
    })).max(200),
  }).parse(d))
  .handler(async ({ data, context }): Promise<{ answer: string; error?: string }> => {
    if (!(await consumeAiQuota(context.supabase))) return { answer: "", error: RATE_LIMIT_MSG };
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { answer: "", error: "שירות ה-AI אינו מוגדר" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const system = `את עוזרת אישית לניהול מלאי המזון בבית. עני בעברית, בקצרה ובידידותיות (עד 5 משקלים), רק על בסיס רשימת המלאי שניתנה.
אל תמציאי מוצרים שאינם ברשימה. אם המידע חסר, אמרי זאת. stockStatus: full=מלא, half=חצי מלא, low=כמעט נגמר. expiryDate ריק או yyyy-mm-dd.`;
    const stockLabels: Record<string, string> = { full: "מלא", half: "חצי מלא", low: "כמעט נגמר" };
    const inventory = data.items
      .map((i) => `${i.name} — כמות ${i.quantity}${i.unit ? ` ${i.unit}` : ""}, סטטוס ${stockLabels[i.stockStatus] ?? i.stockStatus}${i.expiryDate ? `, תפוגה ${i.expiryDate}` : ""}`)
      .join("\n");
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system,
        prompt: `${inventory || "(המלאי ריק)"}\n\nשאלה: ${data.question}`,
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const text = await result.text;
      return { answer: text.trim().slice(0, 1500) };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { answer: "", error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { answer: "", error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("askInventoryAssistant failed", e);
      return { answer: "", error: "לא הצלחנו לענות כרגע, נסו שוב" };
    }
  });
