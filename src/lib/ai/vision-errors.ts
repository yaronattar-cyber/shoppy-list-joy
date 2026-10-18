export const VISION_QUOTA_MESSAGE = "מכסת ה-AI הסתיימה או שחלה שגיאה בחיבור, אנא נסה שוב מאוחר יותר";
export function visionErrorMessage(status?: number): string {
  if (status === 402 || status === 429 || !status || status >= 500) return VISION_QUOTA_MESSAGE;
  if (status === 401 || status === 403) return "אין גישה לשירות Gemini. יש לבדוק את המפתח ואת הרשאות החשבון";
  if (status === 404) return "דגם Gemini אינו זמין כרגע";
  return "Gemini לא הצליח לעבד את התמונה";
}