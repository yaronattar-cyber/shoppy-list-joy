import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  familyIdFromUrl,
  loadFamilyId,
  newFamilyCode,
  saveFamilyId,
} from "@/lib/family";
import { loadUserName, saveUserName } from "@/lib/user-name";

// כניסה אנונימית שקופה — נדרשת כדי שההרשאות יזהו את המכשיר
async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) console.error("signInAnonymously", error);
}

// יוצר את המשפחה אם צריך ורושם את המשתמש כחבר בה (גם למשפחות קיימות — מעבר ללא איבוד נתונים)
async function ensureFamily(id: string, name?: string) {
  await ensureSession();
  const { error } = await supabase.rpc("join_family", { _id: id, _name: name ?? "" });
  if (error) console.error("ensureFamily", error);
}

// זהות המשתמש והקבוצה: קישור הזמנה > שמור מקומית > יצירת קבוצה חדשה
export function useFamily() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [joinedFromLink, setJoinedFromLink] = useState(false);
  const [ready, setReady] = useState(false);
  // המשפחה הקודמת — כדי להציע מיזוג פריטים אחרי הצטרפות
  const [previousFamilyId, setPreviousFamilyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      const fromUrl = familyIdFromUrl();
      const stored = loadFamilyId();
      const id = fromUrl ?? stored ?? newFamilyCode();
      saveFamilyId(id);
      await ensureFamily(id);
      if (!active) return;
      setFamilyId(id);
      setUserName(loadUserName());
      setJoinedFromLink(!!fromUrl && fromUrl !== stored);
      if (fromUrl && stored && fromUrl !== stored) setPreviousFamilyId(stored);
      setReady(true);
    };
    void boot();
    return () => {
      active = false;
    };
  }, []);

  const chooseName = useCallback((name: string) => {
    saveUserName(name);
    setUserName(name.trim());
  }, []);

  const joinFamily = useCallback(async (id: string) => {
    const clean = id.trim().toUpperCase();
    if (!clean) return;
    await ensureFamily(clean);
    const prev = loadFamilyId();
    saveFamilyId(clean);
    setFamilyId(clean);
    if (prev && prev !== clean) setPreviousFamilyId(prev);
  }, []);

  const clearPrevious = useCallback(() => setPreviousFamilyId(null), []);

  const createFamily = useCallback(async (name?: string) => {
    const id = newFamilyCode();
    await ensureFamily(id, name);
    saveFamilyId(id);
    setFamilyId(id);
    return id;
  }, []);

  return { familyId, previousFamilyId, clearPrevious, userName, ready, joinedFromLink, chooseName, joinFamily, createFamily };
}
