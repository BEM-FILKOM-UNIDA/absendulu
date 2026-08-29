-- Faculty is a fixed application value; students cannot edit phone through profile self-service.
-- Revoke the broader phone-column grant from the previous profile migration.

REVOKE UPDATE (phone)
  ON TABLE public.profiles
  FROM authenticated;
