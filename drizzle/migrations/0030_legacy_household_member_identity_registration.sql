CREATE OR REPLACE FUNCTION public.register_household_member(_family text,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_family_member(_family) OR length(trim(_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Forbidden or invalid name'; END IF;
 IF EXISTS(SELECT 1 FROM public.family_members WHERE family_id=_family AND name=trim(_name) AND user_id IS NOT NULL AND user_id<>auth.uid()) THEN RAISE EXCEPTION 'Name already used'; END IF;
 UPDATE public.family_members SET name=trim(_name),last_seen=now() WHERE family_id=_family AND user_id=auth.uid();
 IF NOT FOUND THEN
  UPDATE public.family_members SET user_id=auth.uid(),last_seen=now() WHERE family_id=_family AND name=trim(_name) AND user_id IS NULL;
  IF NOT FOUND THEN INSERT INTO public.family_members(family_id,name,user_id,last_seen) VALUES(_family,trim(_name),auth.uid(),now()); END IF;
 END IF;
END $$;