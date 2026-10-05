CREATE TABLE public.ai_rate_limits (
  user_id uuid PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(_limit integer DEFAULT 20)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c integer;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  INSERT INTO public.ai_rate_limits AS r (user_id, window_start, count) VALUES (uid, now(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    window_start = CASE WHEN r.window_start < now() - interval '1 hour' THEN now() ELSE r.window_start END,
    count = CASE WHEN r.window_start < now() - interval '1 hour' THEN 1 ELSE r.count + 1 END
  RETURNING count INTO c;
  RETURN c <= least(_limit, 20);
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_quota(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(integer) TO authenticated;