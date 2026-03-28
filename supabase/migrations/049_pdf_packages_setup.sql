-- 049_pdf_packages_setup.sql
-- Adds pdf_purchased trigger event for upsell sequences
-- Adds pending_pdf order status for manual PDF delivery flow

BEGIN;

-- Allow pdf_purchased as trigger event for email sequences
ALTER TABLE email_sequences DROP CONSTRAINT IF EXISTS email_sequences_trigger_event_check;
ALTER TABLE email_sequences ADD CONSTRAINT email_sequences_trigger_event_check
  CHECK (trigger_event = ANY (ARRAY[
    'lead_created', 'lead_verified', 'profile_created',
    'order_completed', 'session_completed', 'tag_added',
    'manual', 'pdf_purchased'
  ]));

COMMIT;
