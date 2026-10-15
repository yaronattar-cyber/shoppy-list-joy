// חילוץ מתכון מתמונה: מתכון כתוב או צילום מנה מבושלת (Lovable AI Gateway, צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, RATE_LIMIT_MSG } from "./rate-limit.server";

const schema = z.object({
  title: z.string(),
  category: z.string(),
  prep_time_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({ item_name: z.string(), amount: z.number().nullable(), unit: z.string() })),
  instructions: z.array(z.string()),
});
export type ExtractedRecipe = z.infer<typeof schema>;

export const recipeFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ images: z.array(z.string().startsWith("data:image/").max(1_500_000)).min(1), mode: z.enum(["written", "dish"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: ExtractedRecipe; error?: string }> => {
    if (data.images.reduce((sum, image) => sum + image.length, 0) > 8_000_000) return { error: "התמונות גדולות מדי, בחרו פחות תמונות" };
    if (!(await consumeAiQuota(context.supabase))) return { error: RATE_LIMIT_MSG };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { createLovableAiGatewayProvider } = await import("./gateway-helpers.server");
    const { streamText, Output } = await import("ai");
    const provider = createLovableAiGatewayProvider(apiKey, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
    const system = data.mode === "written"
      ? "בתמונה מתכון כתוב. חלץ בעברית: title, prep_time_minutes, servings, ingredients (item_name קצר, amount מספרי או null, unit), instructions (שלב לכל פריט). אם אין מתכון החזר title ריק."
      : "בתמונה מנה מבושלת. זהה אותה והחזר בעברית מתכון מתאים: title, prep_time_minutes משוער, servings משוער, ingredients עם כמויות משוערות (item_name קצר כפי שקונים בסופר, amount מספרי, unit), instructions 3-8 שלבים. אם אין מנה החזר title ריק.";
    let streamError: unknown;
    try {
      const res = streamText({
        model: provider("google/gemini-3.8-flash"),
        system: `${system} כל התמונות שייכות לאותו מתכון; אחד רכיבים והוראות ללא כפילויות. החזר JSON עם category אחת מתוך: בשרי, צמחוני, טבעוני, קינוחים, אחר.`,
        messages: [{ role: "user", content: [{ type: "text", text: "חלץ מתכון מהתמונה" }, ...data.images.map((image) => ({ type: "image" as const, image: new URL(image) }))] }],
        output: Output.object({ schema }),
        maxRetries: 0,
        onError: ({ error }) => { streamError = error; },
      });
      const out = await res.output;
      if (!out?.title) return { error: "לא זוהה מתכון בתמונה, נסו שוב" };
      return { result: out };
    } catch (e: any) {
      const failure = (streamError ?? e) as { statusCode?: number; status?: number; responseBody?: string; message?: string };
      const status = failure.statusCode ?? failure.status;
      let safeMessage = failure.message;
      if (failure.responseBody) {
        try { const body = JSON.parse(failure.responseBody); safeMessage = body.error?.message ?? body.message ?? safeMessage; } catch { /* Non-JSON upstream error */ }
      }
      if (status === 429) return { error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status && status >= 400) return { error: safeMessage ?? "השירות אינו זמין כעת" };
      console.error("recipeFromImage failed", e);
      return { error: "הניתוח נכשל, נסו שוב" };
    }
  });
