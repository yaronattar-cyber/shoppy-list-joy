// הגבלת קצב לקריאות AI: עד 20 בשעה לכל משתמש (נבדק ומתעדכן בשרת בלבד)
import type { SupabaseClient } from "@supabase/supabase-js";

export const RATE_LIMIT_MSG = "הגעת למגבלת השימוש, נסו שוב מאוחר יותר";

export async function consumeAiQuota(supabase: SupabaseClient<any>): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_ai_quota", { _limit: 20 });
  if (error) { console.error("consume_ai_quota failed", error); return false; }
  return data === true;
}
