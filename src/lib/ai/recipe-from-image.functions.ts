// חילוץ מתכון מתמונה: מתכון כתוב או צילום מנה מבושלת (Lovable AI Gateway, צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

const schema = z.object({
  title: z.string(),
  prep_time_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({ item_name: z.string(), amount: z.number().nullable(), unit: z.string() })),
  instructions: z.array(z.string()),
});
export type ExtractedRecipe = z.infer<typeof schema>;

export const recipeFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(8_000_000), mode: z.enum(["written", "dish"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: ExtractedRecipe; error?: string }> => {
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
    const system = data.mode === "written"
      ? "בתמונה מתכון כתוב. חלץ בעברית: title, prep_time_minutes, servings, ingredients (item_name קצר, amount מספרי או null, unit), instructions (שלב לכל פריט). אם אין מתכון החזר title ריק."
      : "בתמונה מנה מבושלת. זהה אותה והחזר בעברית מתכון מתאים: title, prep_time_minutes משוער, servings משוער, ingredients עם כמויות משוערות (item_name קצר כפי שקונים בסופר, amount מספרי, unit), instructions 3-8 שלבים. אם אין מנה החזר title ריק.";
    try {
      const res = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system,
        messages: [{ role: "user", content: [{ type: "text", text: "חלץ מתכון מהתמונה" }, { type: "image", image: new URL(data.image) }] }],
        output: Output.object({ schema }),
        maxRetries: 0,
        providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      });
      const out = await res.output;
      if (!out?.title) return { error: "לא זוהה מתכון בתמונה, נסו שוב" };
      return { result: out };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("recipeFromImage failed", e);
      return { error: "הניתוח נכשל, נסו שוב" };
    }
  });
