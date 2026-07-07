-- Twilio billing hardening: idempotency, atomic wallet mutations, and RLS.

CREATE UNIQUE INDEX IF NOT EXISTS twilio_balance_topups_payment_intent_unique_idx
  ON public.twilio_balance_topups (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS twilio_wallet_debits_source_unique_idx
  ON public.twilio_wallet_debits (business_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own billing invoices"
ON public.billing_invoices;

CREATE POLICY "Users can view own billing invoices"
ON public.billing_invoices
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS "Service role manages billing invoices"
ON public.billing_invoices;

CREATE POLICY "Service role manages billing invoices"
ON public.billing_invoices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own twilio topups"
ON public.twilio_balance_topups;

CREATE POLICY "Users can view own twilio topups"
ON public.twilio_balance_topups
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS "Service role manages twilio topups"
ON public.twilio_balance_topups;

CREATE POLICY "Service role manages twilio topups"
ON public.twilio_balance_topups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own twilio wallet debits"
ON public.twilio_wallet_debits;

CREATE POLICY "Users can view own twilio wallet debits"
ON public.twilio_wallet_debits
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id));

DROP POLICY IF EXISTS "Service role manages twilio wallet debits"
ON public.twilio_wallet_debits;

CREATE POLICY "Service role manages twilio wallet debits"
ON public.twilio_wallet_debits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_twilio_topup_credit(
  p_business_id UUID,
  p_credit_cents INTEGER,
  p_fee_cents INTEGER,
  p_charged_cents INTEGER,
  p_payment_intent_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topup_id UUID;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id is required';
  END IF;

  IF p_credit_cents <= 0 THEN
    RAISE EXCEPTION 'credit_cents must be positive';
  END IF;

  IF p_payment_intent_id IS NULL OR btrim(p_payment_intent_id) = '' THEN
    RAISE EXCEPTION 'payment_intent_id is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('twilio-topup:' || p_payment_intent_id));

  SELECT id
  INTO v_topup_id
  FROM public.twilio_balance_topups
  WHERE stripe_payment_intent_id = p_payment_intent_id
  LIMIT 1;

  IF v_topup_id IS NOT NULL THEN
    RETURN v_topup_id;
  END IF;

  INSERT INTO public.twilio_balance_topups (
    business_id,
    amount_cents,
    credited_cents,
    fee_cents,
    charged_cents,
    stripe_payment_intent_id,
    status
  )
  VALUES (
    p_business_id,
    p_credit_cents,
    p_credit_cents,
    GREATEST(p_fee_cents, 0),
    GREATEST(p_charged_cents, p_credit_cents),
    p_payment_intent_id,
    'completed'
  )
  RETURNING id INTO v_topup_id;

  UPDATE public.businesses
  SET twilio_wallet_balance_cents = twilio_wallet_balance_cents + p_credit_cents
  WHERE id = p_business_id;

  RETURN v_topup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_twilio_wallet_once(
  p_business_id UUID,
  p_amount_cents INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_debit_id UUID;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'business_id is required');
  END IF;

  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid debit amount.');
  END IF;

  IF p_source_type IS NULL OR btrim(p_source_type) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'source_type is required');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('twilio-wallet:' || p_business_id::TEXT));

  IF p_source_id IS NOT NULL AND btrim(p_source_id) <> '' THEN
    SELECT id
    INTO v_debit_id
    FROM public.twilio_wallet_debits
    WHERE business_id = p_business_id
      AND source_type = p_source_type
      AND source_id = p_source_id
    LIMIT 1;

    IF v_debit_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'debitId', v_debit_id);
    END IF;
  END IF;

  SELECT twilio_wallet_balance_cents
  INTO v_balance
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Business not found.');
  END IF;

  IF v_balance < p_amount_cents THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient Twilio balance.');
  END IF;

  INSERT INTO public.twilio_wallet_debits (
    business_id,
    amount_cents,
    source_type,
    source_id,
    description
  )
  VALUES (
    p_business_id,
    p_amount_cents,
    p_source_type,
    NULLIF(btrim(COALESCE(p_source_id, '')), ''),
    NULLIF(btrim(COALESCE(p_description, '')), '')
  )
  RETURNING id INTO v_debit_id;

  UPDATE public.businesses
  SET twilio_wallet_balance_cents = twilio_wallet_balance_cents - p_amount_cents
  WHERE id = p_business_id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'debitId', v_debit_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_twilio_topup_credit(UUID, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debit_twilio_wallet_once(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_twilio_topup_credit(UUID, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_twilio_wallet_once(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
