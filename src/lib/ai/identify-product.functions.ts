// זיהוי מוצר מתמונה לחיפוש בחנויות אונליין (Lovable AI Gateway, צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota } from "./rate-limit.server";
import { VISION_QUOTA_MESSAGE } from "./vision-errors";
import { productVisionSchema as productSchema } from "./vision-schemas";

export type ProductIdentification = z.infer<typeof productSchema>;

export const identifyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(8_000_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: ProductIdentification; error?: string }> => {
    if (data.image.length > 1_500_000) return { error: "התמונה גדולה מדי (מעל 1.5MB)" };
    if (!(await consumeAiQuota(context.supabase))) return { error: VISION_QUOTA_MESSAGE };
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { geminiVision } = await import("./gemini-vision.server");
    try {
      const out = await geminiVision(apiKey, "זהה את המוצר המדויק בתמונה. החזר JSON: productTitle שם המוצר בעברית כולל מותג וגודל אריזה אם הם קריאים, brand מותג או מחרוזת ריקה, packageSize גודל האריזה או מחרוזת ריקה, category מזהה אחד מתוך dairy, produce, meat, vegetarian, bakery, canned, pantry, oils, spices, frozen, drinks, snacks, cleaning, other. searchKeywords מילות חיפוש באנגלית. אל תמציא מחירים או פרטים שאינם נראים. אם אין מוצר החזר productTitle ריק.", [data.image], productSchema);
      if (!out?.productTitle) return { error: "לא זוהה מוצר בתמונה, נסו לצלם שוב" };
      return { result: out };
    } catch (e) {
      return { error: e instanceof Error ? e.message : VISION_QUOTA_MESSAGE };
    }
  });
