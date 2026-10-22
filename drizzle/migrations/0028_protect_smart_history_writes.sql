REVOKE INSERT ON public.inventory_usage_events, public.receipt_unit_prices FROM authenticated;
DROP POLICY "members record inventory usage" ON public.inventory_usage_events;
DROP POLICY "members record receipt prices" ON public.receipt_unit_prices;
ALTER FUNCTION public.record_inventory_usage() SECURITY DEFINER;
ALTER FUNCTION public.snapshot_receipt_prices() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.record_inventory_usage(), public.snapshot_receipt_prices() FROM PUBLIC, anon, authenticated;