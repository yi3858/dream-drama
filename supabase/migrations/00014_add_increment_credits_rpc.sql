CREATE OR REPLACE FUNCTION public.increment_profile_credits(
    p_user_id UUID,
    p_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET credits = COALESCE(credits, 0) + p_amount
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
