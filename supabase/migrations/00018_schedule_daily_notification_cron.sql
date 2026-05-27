SELECT cron.schedule(
  'notify-expiring-points-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
      url:='https://backend.appmiaoda.com/projects/supabase315346942760632320/functions/v1/notify_expiring_points',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDk0NjExNzcwLCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJzdWIiOiJzZXJ2aWNlX3JvbGUifQ.UL0sLRul_--DoZq6rVVQIp0LLP0J88Jm-mWfqgsRreI'
      )
  )
  $$
);