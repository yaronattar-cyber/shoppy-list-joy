CREATE TABLE public.user_roles (user_id uuid NOT NULL, family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'admin', PRIMARY KEY(user_id,family_id), CONSTRAINT household_admin_role CHECK(role='admin'));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own household roles" ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_family_member(family_id));
CREATE FUNCTION public.is_household_admin(_family text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE family_id=_family AND user_id=auth.uid() AND role='admin') AND EXISTS(SELECT 1 FROM public.family_memberships WHERE family_id=_family AND user_id=auth.uid()) $$;
REVOKE ALL ON FUNCTION public.is_household_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_admin(text) TO authenticated;
INSERT INTO public.user_roles(user_id,family_id) SELECT DISTINCT ON(m.family_id) m.user_id,m.family_id FROM public.family_memberships m JOIN public.families f ON f.id=m.family_id WHERE f.kind='family' ORDER BY m.family_id,m.created_at,m.user_id;
CREATE TABLE public.household_removed_members (family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,user_id uuid NOT NULL,PRIMARY KEY(family_id,user_id));
GRANT ALL ON public.household_removed_members TO service_role;
ALTER TABLE public.household_removed_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ADD COLUMN user_id uuid;
CREATE UNIQUE INDEX family_members_user_unique ON public.family_members(family_id,user_id) WHERE user_id IS NOT NULL;
DROP POLICY "members insert family_members" ON public.family_members;
DROP POLICY "members update family_members" ON public.family_members;
DROP POLICY "members delete family_members" ON public.family_members;
REVOKE INSERT, UPDATE, DELETE ON public.family_members FROM authenticated;
CREATE FUNCTION public.register_household_member(_family text,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_family_member(_family) OR length(trim(_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Forbidden or invalid name'; END IF;
 IF EXISTS(SELECT 1 FROM public.family_members WHERE family_id=_family AND name=trim(_name) AND user_id IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'Name already used'; END IF;
 UPDATE public.family_members SET name=trim(_name),last_seen=now() WHERE family_id=_family AND user_id=auth.uid();
 IF NOT FOUND THEN INSERT INTO public.family_members(family_id,name,user_id,last_seen) VALUES(_family,trim(_name),auth.uid(),now()); END IF;
END $$;
REVOKE ALL ON FUNCTION public.register_household_member(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_household_member(text,text) TO authenticated;
CREATE FUNCTION public.manage_household_member(_family text,_name text,_action text,_value text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
 IF NOT public.is_household_admin(_family) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.families WHERE id=_family FOR UPDATE;
 SELECT user_id INTO target FROM public.family_members WHERE family_id=_family AND name=_name;
 IF _action='role' THEN
  IF _value NOT IN ('','אבא','אמא','בן','בת') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  UPDATE public.family_members SET role=_value WHERE family_id=_family AND name=_name;
 ELSIF _action='admin' THEN
  IF target IS NULL THEN RAISE EXCEPTION 'Member has no linked device'; END IF;
  IF _value='true' THEN INSERT INTO public.user_roles(user_id,family_id) VALUES(target,_family) ON CONFLICT DO NOTHING;
  ELSE
   IF (SELECT count(*) FROM public.user_roles WHERE family_id=_family)<=1 AND EXISTS(SELECT 1 FROM public.user_roles WHERE family_id=_family AND user_id=target) THEN RAISE EXCEPTION 'Last administrator'; END IF;
   DELETE FROM public.user_roles WHERE family_id=_family AND user_id=target;
  END IF;
 ELSIF _action='remove' THEN
  IF target=auth.uid() THEN RAISE EXCEPTION 'Cannot remove yourself'; END IF;
  IF target IS NOT NULL THEN
   INSERT INTO public.household_removed_members VALUES(_family,target) ON CONFLICT DO NOTHING;
   DELETE FROM public.user_roles WHERE family_id=_family AND user_id=target;
   DELETE FROM public.family_memberships WHERE family_id=_family AND user_id=target;
  END IF;
  DELETE FROM public.family_members WHERE family_id=_family AND name=_name;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_household_member(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_household_member(text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.join_family(_id text,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE attempts integer; created boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 IF _id IS NULL OR length(_id)<4 OR length(_id)>40 THEN RAISE EXCEPTION 'bad id'; END IF;
 IF EXISTS(SELECT 1 FROM public.household_removed_members WHERE family_id=_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden: membership removed'; END IF;
 INSERT INTO public.join_attempts(user_id,window_start,count) VALUES(auth.uid(),date_trunc('hour',now()),1) ON CONFLICT(user_id,window_start) DO UPDATE SET count=public.join_attempts.count+1 RETURNING count INTO attempts;
 IF attempts>20 THEN RAISE EXCEPTION 'too many attempts'; END IF;
 INSERT INTO public.families(id,name) VALUES(_id,coalesce(nullif(_name,''),'המשפחה שלי')) ON CONFLICT(id) DO NOTHING;
 created:=FOUND;
 INSERT INTO public.family_memberships(user_id,family_id) VALUES(auth.uid(),_id) ON CONFLICT DO NOTHING;
 IF created THEN INSERT INTO public.user_roles(user_id,family_id) VALUES(auth.uid(),_id); END IF;
END $$;
ALTER TABLE public.families ADD COLUMN event_date date, ADD COLUMN event_time time, ADD COLUMN location text NOT NULL DEFAULT '', ADD COLUMN notes text NOT NULL DEFAULT '', ADD COLUMN assigned_members uuid[] NOT NULL DEFAULT '{}', ADD COLUMN event_tasks jsonb NOT NULL DEFAULT '[]';
CREATE FUNCTION public.update_event_details(_event text,_title text,_date date,_time time,_location text,_notes text,_members uuid[],_tasks jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id text; task jsonb;
BEGIN
 SELECT owner_family_id INTO owner_id FROM public.families WHERE id=_event AND kind='event' FOR UPDATE;
 IF owner_id IS NULL OR NOT public.is_family_member(owner_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF length(trim(_title)) NOT BETWEEN 1 AND 100 OR length(_location)>300 OR length(_notes)>5000 OR jsonb_typeof(_tasks)<>'array' OR jsonb_array_length(_tasks)>50 THEN RAISE EXCEPTION 'Invalid event'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(_members) u WHERE NOT EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=u AND family_id=owner_id)) THEN RAISE EXCEPTION 'Invalid assignee'; END IF;
 FOR task IN SELECT value FROM jsonb_array_elements(_tasks) LOOP
  IF length(trim(task->>'title')) NOT BETWEEN 1 AND 200 OR (coalesce(task->>'assignee','')<>'' AND NOT EXISTS(SELECT 1 FROM public.family_memberships WHERE family_id=owner_id AND user_id=(task->>'assignee')::uuid)) THEN RAISE EXCEPTION 'Invalid task'; END IF;
 END LOOP;
 UPDATE public.families SET name=trim(_title),event_date=_date,event_time=_time,location=_location,notes=_notes,assigned_members=coalesce(_members,'{}'),event_tasks=_tasks WHERE id=_event;
END $$;
REVOKE ALL ON FUNCTION public.update_event_details(text,text,date,time,text,text,uuid[],jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_event_details(text,text,date,time,text,text,uuid[],jsonb) TO authenticated;
ALTER TABLE public.items ADD COLUMN added_by_user_id uuid, ADD COLUMN modified_by_user_id uuid, ADD COLUMN modified_by text NOT NULL DEFAULT '', ADD COLUMN modified_at timestamptz;
CREATE FUNCTION public.stamp_item_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE member_name text;
BEGIN
 IF auth.uid() IS NOT NULL THEN
  SELECT name INTO member_name FROM public.family_members WHERE user_id=auth.uid() AND (family_id=NEW.family_id OR EXISTS(SELECT 1 FROM public.event_members e WHERE e.event_id=NEW.family_id AND e.family_id=family_members.family_id)) ORDER BY last_seen DESC LIMIT 1;
  IF TG_OP='INSERT' THEN NEW.added_by_user_id:=auth.uid(); IF member_name IS NOT NULL THEN NEW.added_by:=member_name; END IF;
  ELSE NEW.added_by_user_id:=OLD.added_by_user_id; NEW.added_by:=OLD.added_by; END IF;
  NEW.modified_by_user_id:=auth.uid(); NEW.modified_by:=coalesce(member_name,NEW.added_by); NEW.modified_at:=now();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_item_member BEFORE INSERT OR UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.stamp_item_member();
ALTER PUBLICATION supabase_realtime ADD TABLE public.families,public.user_roles;
