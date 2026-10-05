CREATE TABLE public.join_attempts (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
ALTER TABLE public.join_attempts ENABLE ROW LEVEL SECURITY;
-- אין מדיניות ואין grants: גישה רק דרך פונקציית security definer

DROP FUNCTION public.join_family(text, text);

CREATE FUNCTION public.join_family(_id text, _name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _id IS NULL OR length(_id) < 4 OR length(_id) > 40 THEN RAISE EXCEPTION 'bad id'; END IF;

  -- הגבלת ניסיונות: עד 20 הצטרפויות בשעה לכל משתמש
  INSERT INTO public.join_attempts (user_id, window_start, count)
  VALUES (auth.uid(), date_trunc('hour', now()), 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET count = public.join_attempts.count + 1
  RETURNING count INTO attempts;
  IF attempts > 20 THEN RAISE EXCEPTION 'too many attempts'; END IF;

  INSERT INTO public.families (id, name) VALUES (_id, coalesce(nullif(_name, ''), 'המשפחה שלי')) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.family_memberships (user_id, family_id) VALUES (auth.uid(), _id) ON CONFLICT DO NOTHING;
END $$;