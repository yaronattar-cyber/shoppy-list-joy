import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// בני משפחה ותפקידים (אבא/אמא/בן/בת), מסונכרן בזמן אמת
export type Member = { name: string; role: string; lastSeen: string };
export const ROLES = ["אבא", "אמא", "בן", "בת"] as const;
export const ROLE_EMOJI: Record<string, string> = { אבא: "👨", אמא: "👩", בן: "👦", בת: "👧" };

export function useFamilyMembers(familyId: string | null, userName: string | null | undefined) {
  const [members, setMembers] = useState<Member[]>([]);

  const load = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("family_members").select("name, role, last_seen").eq("family_id", familyId).order("name");
    if (data) setMembers(data.map((m) => ({ name: m.name, role: m.role, lastSeen: m.last_seen })));
  }, [familyId]);

  useEffect(() => {
    const me = userName?.trim();
    if (!familyId || !me) return;
    void supabase
      .from("family_members")
      .upsert({ family_id: familyId, name: me, last_seen: new Date().toISOString() }, { onConflict: "family_id,name", ignoreDuplicates: false })
      .then(() => load());
    const ch = supabase
      .channel(`members-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_members", filter: `family_id=eq.${familyId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [familyId, userName, load]);

  const setRole = useCallback(
    async (name: string, role: string) => {
      if (!familyId) return;
      setMembers((ms) => ms.map((m) => (m.name === name ? { ...m, role } : m)));
      await supabase.from("family_members").update({ role }).eq("family_id", familyId).eq("name", name);
    },
    [familyId],
  );

  return { members, setRole };
}

// מיפוי שם → תפקיד לשימוש בשורות הרשימה
export const MembersContext = createContext<Record<string, string>>({});
export const useMemberRole = (name: string) => useContext(MembersContext)[name] ?? "";
