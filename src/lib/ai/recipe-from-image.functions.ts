// חילוץ מתכון מתמונה: מתכון כתוב או צילום מנה מבושלת (Lovable AI Gateway, צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota } from "./rate-limit.server";

import { VISION_QUOTA_MESSAGE } from "./vision-errors";
import { recipeVisionSchema as schema } from "./vision-schemas";

export type ExtractedRecipe = z.infer<typeof schema>;

export const recipeFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ images: z.array(z.string().startsWith("data:image/").max(1_500_000)).min(1), mode: z.enum(["written", "dish"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: ExtractedRecipe; error?: string }> => {
    if (data.images.reduce((sum, image) => sum + image.length, 0) > 8_000_000) return { error: "התמונות גדולות מדי, בחרו פחות תמונות" };
    if (!(await consumeAiQuota(context.supabase))) return { error: VISION_QUOTA_MESSAGE };
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { geminiVision } = await import("./gemini-vision.server");
    const system = data.mode === "written"
      ? "בתמונה מתכון כתוב. חלץ בעברית: title, prep_time_minutes, servings, ingredients (item_name קצר, amount מספרי או null, unit), instructions (שלב לכל פריט). אם אין מתכון החזר title ריק."
      : "בתמונה מנה מבושלת. זהה אותה והחזר בעברית מתכון מתאים: title, prep_time_minutes משוער, servings משוער, ingredients עם כמויות משוערות (item_name קצר כפי שקונים בסופר, amount מספרי, unit), instructions 3-8 שלבים. אם אין מנה החזר title ריק.";
    try {
      const out = await geminiVision(apiKey, `${system} כל התמונות שייכות לאותו מתכון; אחד רכיבים והוראות ללא כפילויות. החזר JSON עם category אחת מתוך: בשרי, צמחוני, טבעוני, קינוחים, אחר.`, data.images, schema);
      if (!out?.title) return { error: "לא זוהה מתכון בתמונה, נסו שוב" };
      return { result: out };
    } catch (e) {
      return { error: e instanceof Error ? e.message : VISION_QUOTA_MESSAGE };
    }
  });
