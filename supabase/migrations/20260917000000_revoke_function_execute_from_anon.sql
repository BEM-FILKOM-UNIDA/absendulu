-- Close PostgREST /rest/v1/rpc exposure for internal SECURITY DEFINER helpers.
-- Trigger functions fire without EXECUTE privilege checks, so revoking changes
-- nothing for on_auth_user_created and prevent_duplicate_event_attendance_trigger.
-- is_admin() keeps EXECUTE for authenticated: RLS policies call it on every
-- authenticated query, and it only discloses the caller's own admin boolean.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_duplicate_event_attendance() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
