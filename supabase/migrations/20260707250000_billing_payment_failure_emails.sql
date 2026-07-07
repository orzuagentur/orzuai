-- Billing payment failure and card expiring email templates

INSERT INTO public.email_templates (
  id,
  name,
  category,
  description,
  subject_template,
  from_email,
  is_system
) VALUES
  (
    'payment_card_failed',
    'Card payment failed',
    'billing',
    'Sent when a subscription card payment fails (real Stripe invoice.payment_failed).',
    'Action required: your OrzuX payment failed',
    'billing',
    true
  ),
  (
    'payment_bank_failed',
    'Bank debit payment failed',
    'billing',
    'Sent when a subscription bank debit/transfer payment fails (real Stripe invoice.payment_failed).',
    'Action required: your OrzuX bank payment failed',
    'billing',
    true
  ),
  (
    'card_expiring',
    'Card expiring soon',
    'billing',
    'Sent when the default payment card is expiring soon (Stripe customer.source.expiring or invoice.upcoming).',
    'Your OrzuX payment card is expiring soon',
    'billing',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  subject_template = EXCLUDED.subject_template,
  from_email = COALESCE(public.email_templates.from_email, EXCLUDED.from_email);
