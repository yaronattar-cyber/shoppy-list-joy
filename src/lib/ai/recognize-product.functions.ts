// זיהוי שם מוצר מתמונה באמצעות Lovable AI Gateway (צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const recognizeProduct = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ image: z.string().startsWith("data:image/").max(4_000_000) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ name: string; error?: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { name: "", error: "שירות ה-AI אינו מוגדר" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system:
          "זהה את המוצר בתמונה (אריזה/פרי/ירק). החזר רק את שם המוצר הקצר בעברית כפי שמחפשים אותו בסופר, כולל מותג אם נראה בבירור. ללא הסברים, ללא מרכאות. אם לא ניתן לזהות מוצר החזר בדיוק: לא זוהה",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "מה שם המוצר?" },
              { type: "image", image: new URL(data.image) },
            ],
          },
        ],
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const name = (await result.text).trim().replace(/^["'״]+|["'״.]+$/g, "").slice(0, 80);
      if (!name || name.includes("לא זוהה")) return { name: "", error: "לא הצלחנו לזהות את המוצר, נסו לצלם שוב" };
      return { name };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { name: "", error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { name: "", error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("recognizeProduct failed", e);
      return { name: "", error: "הזיהוי נכשל, נסו שוב" };
    }
  });
