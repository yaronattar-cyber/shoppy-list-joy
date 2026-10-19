// סריקת פתק קניות (כתב יד/מודפס, עברית/אנגלית) לרשימת מוצרים — צד שרת בלבד
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota } from "./rate-limit.server";

import { VISION_QUOTA_MESSAGE } from "./vision-errors";

const schema = z.object({ items: z.array(z.string()) });

export const scanNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(1_500_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ items?: string[]; error?: string }> => {
    if (!(await consumeAiQuota(context.supabase))) return { error: VISION_QUOTA_MESSAGE };
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) return { error: "שירות ה-AI אינו מוגדר" };
    const { geminiVision } = await import("./gemini-vision.server");
    try {
      const out = await geminiVision(apiKey, "בתמונה פתק קניות בכתב יד או מודפס, בעברית או באנגלית. החזר JSON עם items: מערך שמות מוצרים קצרים, אחד לכל שורה בפתק, בשפה המקורית, כולל כמות אם נכתבה. התעלם מכותרות ומחיקות. אם אין פתק החזר מערך ריק.", [data.image], schema);
      const items = (out?.items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 60);
      if (!items.length) return { error: "לא זוהו פריטים בפתק, נסו תמונה ברורה יותר" };
      return { items };
    } catch (e) {
      return { error: e instanceof Error ? e.message : VISION_QUOTA_MESSAGE };
    }
  });
