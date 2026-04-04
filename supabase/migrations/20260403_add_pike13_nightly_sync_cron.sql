-- Enable pg_net extension for HTTP calls from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net
  WITH SCHEMA extensions;

-- Schedule pike13 nightly sync at 2:00 AM UTC
SELECT cron.schedule(
  'pike13-nightly-sync',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qkshyyydmewegfdplhfv.supabase.co/functions/v1/pike13-nightly-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUPABASE_ANON_KEY_PLACEHOLDER"}'::jsonb,
    body := '{"scheduled": true}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
