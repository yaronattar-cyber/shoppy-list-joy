// זיהוי מוצר מתמונה לחיפוש בחנויות אונליין (Lovable AI Gateway, צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

const productSchema = z.object({
  productTitle: z.string(),
  category: z.string(),
  searchKeywords: z.string(),
  priceEstimates: z.object({ aliexpress: z.string(), amazon: z.string(), temu: z.string() }),
});
export type ProductIdentification = z.infer<typeof productSchema>;

export const identifyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(8_000_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: ProductIdentification; error?: string }> => {
    if (data.image.length > 1_500_000) return { error: "התמונה גדולה מדי (מעל 1.5MB)" };
    if (!(await consumeAiQuota(context.supabase))) return { error: RATE_LIMIT_MSG };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const res = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system:
          "זהה את המוצר בתמונה בצורה מדויקת: שם, מותג, דגם/סוג ומאפיינים עיקריים. productTitle בעברית (לדוגמה: 'אוזניות אלחוטיות JBL Tune 510BT' או 'קצף חלב חשמלי'). category בעברית. searchKeywords באנגלית, קצר ומתאים לחיפוש בחנויות אונליין. priceEstimates: טווח מחיר משוער בש\"ח לכל חנות (למשל '₪40–70'). אם אין מוצר בתמונה החזר productTitle ריק.",
        messages: [{ role: "user", content: [{ type: "text", text: "איזה מוצר זה?" }, { type: "image", image: new URL(data.image) }] }],
        output: Output.object({ schema: productSchema }),
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const out = await res.output;
      if (!out?.productTitle) return { error: "לא זוהה מוצר בתמונה, נסו לצלם שוב" };
      return { result: out };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("identifyProduct failed", e);
      return { error: "הזיהוי נכשל, נסו שוב" };
    }
  });
