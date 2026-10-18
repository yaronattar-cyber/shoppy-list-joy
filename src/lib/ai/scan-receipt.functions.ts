import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { receiptSchema, type Receipt } from "@/lib/receipts";
import { consumeAiQuota } from "./rate-limit.server";
import { VISION_QUOTA_MESSAGE } from "./vision-errors";

export const scanReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(1_500_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ result?: Receipt; error?: string }> => {
    const key = process.env["GOOGLE_API_KEY"];
    if (!key) return { error: "מפתח Gemini לא הוגדר" };
    if (!(await consumeAiQuota(context.supabase))) return { error: VISION_QUOTA_MESSAGE };
    try {
      const { geminiVision } = await import("./gemini-vision.server");
      const result = await geminiVision(key, 'Extract this Hebrew/English purchase receipt, not a shopping note. Return JSON only: {store_name:string,purchase_date:"YYYY-MM-DD",total_amount:number,currency:"ILS" or actual ISO code,items:[{name:string,quantity:number,unit_price:number}]}. Use the actual paid total including discounts, not a sum estimate. Unit price is per purchased unit; derive from line total and quantity if necessary. Preserve product names. Never invent missing prices or dates. If essential fields cannot be read return an empty object.', [data.image], receiptSchema);
      return { result };
    } catch (e) { return { error: e instanceof z.ZodError ? "לא זוהתה חשבונית ברורה עם תאריך וסכום, נסו תמונה אחרת" : e instanceof Error ? e.message : VISION_QUOTA_MESSAGE }; }
  });