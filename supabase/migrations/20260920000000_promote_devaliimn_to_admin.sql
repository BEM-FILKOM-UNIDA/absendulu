-- Promote devaliimn@gmail.com to admin

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'devaliimn@gmail.com';
