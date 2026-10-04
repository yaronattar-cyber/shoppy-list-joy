// הצעת מתכונים לפי המלאי הקיים באמצעות Lovable AI Gateway (צד שרת בלבד)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Recipe = { title: string; time: string; have: string[]; missing: string[]; steps: string[] };

export const suggestRecipes = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ items: z.array(z.string().trim().min(1).max(80)).min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<{ recipes: Recipe[]; error?: string }> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { recipes: [], error: "שירות ה-AI אינו מוגדר" };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const system = `אתה שף ביתי. בהינתן רשימת מצרכים שיש בבית, הצע 3 מתכונים ביתיים פשוטים בעברית שמשתמשים בעיקר במה שיש.
החזר JSON בלבד: {"recipes":[{"title":"...","time":"30 דק׳","have":["מצרך מהמלאי"],"missing":["מצרך חסר"],"steps":["שלב קצר"]}]}.
have: רק מצרכים מהרשימה שניתנה. missing: מצרכים חסרים (לא כולל מלח, פלפל, מים, שמן). עד 6 שלבים קצרים.`;
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system,
        prompt: `המלאי שלי: ${data.items.join(", ")}`,
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const text = await result.text;
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 15) : []);
      const recipes: Recipe[] = (Array.isArray(json.recipes) ? json.recipes : [])
        .map((r: any) => ({ title: String(r?.title ?? "").slice(0, 80), time: String(r?.time ?? "").slice(0, 20), have: arr(r?.have), missing: arr(r?.missing), steps: arr(r?.steps) }))
        .filter((r: Recipe) => r.title)
        .slice(0, 3);
      return { recipes };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { recipes: [], error: "יותר מדי בקשות, נסו שוב בעוד רגע" };
      if (status === 402) return { recipes: [], error: "נגמרו קרדיטי ה-AI בסביבת העבודה" };
      console.error("suggestRecipes failed", e);
      return { recipes: [], error: "לא הצלחנו להציע מתכונים, נסו שוב" };
    }
  });
