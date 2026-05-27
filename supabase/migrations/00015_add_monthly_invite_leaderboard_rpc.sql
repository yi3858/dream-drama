CREATE OR REPLACE FUNCTION get_monthly_invite_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (
  inviter_id UUID,
  username TEXT,
  phone TEXT,
  avatar_url TEXT,
  invite_count BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.inviter_id,
    p.username,
    p.phone,
    p.avatar_url,
    COUNT(*) as invite_count
  FROM invite_records ir
  JOIN profiles p ON p.id = ir.inviter_id
  WHERE 
    ir.status = 'completed' AND
    date_trunc('month', ir.created_at) = date_trunc('month', CURRENT_DATE)
  GROUP BY 
    ir.inviter_id, p.username, p.phone, p.avatar_url
  ORDER BY 
    invite_count DESC,
    MIN(ir.created_at) ASC -- 在数量相同时，先达到该数量的用户排在前面
  LIMIT p_limit;
END;
$$;
