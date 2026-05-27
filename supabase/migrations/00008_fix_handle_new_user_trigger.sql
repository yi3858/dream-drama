CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role, promo_code, username)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'user'::public.user_role,
    upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$function$;