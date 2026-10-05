ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS is_online_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stores.is_online_only IS 'Whether the store is online-only and has no physical in-store shopping mode.';