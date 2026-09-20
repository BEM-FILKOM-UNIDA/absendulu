-- Promote devaliimn@gmail.com to admin for production readiness

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'devaliimn@gmail.com';
