-- ═══════════════════════════════════════════════════════════════════════════
-- OPASCRIPT / SCRIPTORA — Phase 4: Affiliate Withdrawal / Payout System
-- Run once in Supabase SQL Editor after Phase 1–3 migrations.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Admin helper (matches Admin Dashboard sidebar.js ADMIN_EMAIL) ───────────
CREATE OR REPLACE FUNCTION public.scriptora_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    lower(auth.jwt() ->> 'email') = lower('yeasinkabirshatif@gmail.com'),
    false
  );
$$;

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_method  text NOT NULL
                    CHECK (payment_method IN ('bkash', 'nagad', 'rocket', 'upay')),
  payment_number  text NOT NULL,
  payment_name    text,
  admin_note      text,
  payout_txn_id   text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  paid_at         timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id   uuid NOT NULL REFERENCES public.affiliate_withdrawals(id) ON DELETE CASCADE,
  commission_id   uuid NOT NULL REFERENCES public.affiliate_commissions(id),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  UNIQUE (withdrawal_id, commission_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_affiliate
  ON public.affiliate_withdrawals (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_client
  ON public.affiliate_withdrawals (client_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status
  ON public.affiliate_withdrawals (status);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawal_items_withdrawal
  ON public.affiliate_withdrawal_items (withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawal_items_commission
  ON public.affiliate_withdrawal_items (commission_id);

-- ── Internal: commissions locked by open withdrawal requests ────────────────
CREATE OR REPLACE FUNCTION public._affiliate_locked_commission_ids(p_affiliate_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wi.commission_id
  FROM public.affiliate_withdrawal_items wi
  JOIN public.affiliate_withdrawals w ON w.id = wi.withdrawal_id
  WHERE w.affiliate_id = p_affiliate_id
    AND w.status IN ('pending', 'approved');
$$;

-- ── Wallet summary for affiliate dashboard ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_affiliate_wallet()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id   uuid := auth.uid();
  v_affiliate   public.affiliates%ROWTYPE;
  v_earned      numeric(12,2) := 0;
  v_lifetime    numeric(12,2) := 0;
  v_available   numeric(12,2) := 0;
  v_pending     numeric(12,2) := 0;
  v_paid_out    numeric(12,2) := 0;
BEGIN
  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT * INTO v_affiliate
  FROM public.affiliates
  WHERE client_id = v_client_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Active affiliate account not found');
  END IF;

  SELECT coalesce(sum(commission_amount), 0) INTO v_earned
  FROM public.affiliate_commissions
  WHERE affiliate_id = v_affiliate.id AND status = 'earned';

  SELECT coalesce(sum(commission_amount), 0) INTO v_lifetime
  FROM public.affiliate_commissions
  WHERE affiliate_id = v_affiliate.id AND status IN ('earned', 'withdrawn');

  SELECT coalesce(sum(amount), 0) INTO v_pending
  FROM public.affiliate_withdrawals
  WHERE affiliate_id = v_affiliate.id AND status IN ('pending', 'approved');

  SELECT coalesce(sum(amount), 0) INTO v_paid_out
  FROM public.affiliate_withdrawals
  WHERE affiliate_id = v_affiliate.id AND status = 'paid';

  v_available := greatest(v_earned - v_pending, 0);

  RETURN jsonb_build_object(
    'success', true,
    'affiliate_id', v_affiliate.id,
    'total_earned', v_lifetime,
    'available_balance', v_available,
    'pending_withdrawal', v_pending,
    'total_paid_out', v_paid_out,
    'min_withdrawal', 500
  );
END;
$$;

-- ── Internal: FIFO commission allocation ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public._allocate_withdrawal_items(
  p_withdrawal_id uuid,
  p_affiliate_id  uuid,
  p_amount        numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric(12,2) := p_amount;
  v_allocated numeric(12,2) := 0;
  r           record;
BEGIN
  FOR r IN
    SELECT c.id, c.commission_amount
    FROM public.affiliate_commissions c
    WHERE c.affiliate_id = p_affiliate_id
      AND c.status = 'earned'
      AND c.id NOT IN (SELECT public._affiliate_locked_commission_ids(p_affiliate_id))
    ORDER BY c.created_at ASC, c.id ASC
  LOOP
    EXIT WHEN v_allocated >= p_amount;

    INSERT INTO public.affiliate_withdrawal_items (withdrawal_id, commission_id, amount)
    VALUES (p_withdrawal_id, r.id, r.commission_amount);

    v_allocated := v_allocated + r.commission_amount;
    v_remaining := v_remaining - r.commission_amount;
  END LOOP;

  RETURN v_allocated;
END;
$$;

-- ── Client: request withdrawal ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal(
  p_amount         numeric,
  p_payment_method text,
  p_payment_number text,
  p_payment_name   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id     uuid := auth.uid();
  v_affiliate     public.affiliates%ROWTYPE;
  v_wallet        jsonb;
  v_available     numeric(12,2);
  v_withdrawal_id uuid;
  v_allocated     numeric(12,2);
  v_clean_number  text;
BEGIN
  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount < 500 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Minimum withdrawal amount is ৳500');
  END IF;

  IF p_payment_method NOT IN ('bkash', 'nagad', 'rocket', 'upay') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid payment method');
  END IF;

  v_clean_number := regexp_replace(trim(coalesce(p_payment_number, '')), '\s+', '', 'g');
  IF length(v_clean_number) < 11 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valid payment number required');
  END IF;

  SELECT * INTO v_affiliate
  FROM public.affiliates
  WHERE client_id = v_client_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Active affiliate account not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.affiliate_withdrawals
    WHERE affiliate_id = v_affiliate.id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a pending withdrawal request');
  END IF;

  v_wallet := public.get_affiliate_wallet();
  v_available := (v_wallet ->> 'available_balance')::numeric;

  IF p_amount > v_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Available: ৳' || to_char(v_available, 'FM999999990.00')
    );
  END IF;

  INSERT INTO public.affiliate_withdrawals (
    affiliate_id, client_id, amount, status,
    payment_method, payment_number, payment_name
  ) VALUES (
    v_affiliate.id, v_client_id, p_amount, 'pending',
    p_payment_method, v_clean_number, nullif(trim(coalesce(p_payment_name, '')), '')
  )
  RETURNING id INTO v_withdrawal_id;

  v_allocated := public._allocate_withdrawal_items(v_withdrawal_id, v_affiliate.id, p_amount);

  IF v_allocated <= 0 OR v_allocated < p_amount THEN
    DELETE FROM public.affiliate_withdrawals WHERE id = v_withdrawal_id;
    RETURN jsonb_build_object('success', false, 'message', 'Could not allocate commissions for this amount');
  END IF;

  IF v_allocated <> p_amount THEN
    UPDATE public.affiliate_withdrawals
    SET amount = v_allocated
    WHERE id = v_withdrawal_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'amount', v_allocated,
    'message', 'Withdrawal request submitted'
  );
END;
$$;

-- ── Admin: approve withdrawal ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_affiliate_withdrawal(
  p_withdrawal_id uuid,
  p_admin_note    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.affiliate_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.scriptora_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;

  SELECT * INTO v_row
  FROM public.affiliate_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_row.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only pending withdrawals can be approved');
  END IF;

  UPDATE public.affiliate_withdrawals
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true, 'message', 'Withdrawal approved');
END;
$$;

-- ── Admin: reject withdrawal ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_affiliate_withdrawal(
  p_withdrawal_id uuid,
  p_admin_note    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.affiliate_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.scriptora_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;

  SELECT * INTO v_row
  FROM public.affiliate_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_row.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal cannot be rejected in current status');
  END IF;

  DELETE FROM public.affiliate_withdrawal_items WHERE withdrawal_id = p_withdrawal_id;

  UPDATE public.affiliate_withdrawals
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true, 'message', 'Withdrawal rejected');
END;
$$;

-- ── Admin: confirm payout (marks commissions withdrawn) ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_confirm_affiliate_payout(
  p_withdrawal_id uuid,
  p_payout_txn_id text,
  p_admin_note    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.affiliate_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.scriptora_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
  END IF;

  IF nullif(trim(coalesce(p_payout_txn_id, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payout transaction ID required');
  END IF;

  SELECT * INTO v_row
  FROM public.affiliate_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_row.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal must be approved before payout');
  END IF;

  UPDATE public.affiliate_commissions c
  SET status = 'withdrawn'
  FROM public.affiliate_withdrawal_items wi
  WHERE wi.withdrawal_id = p_withdrawal_id
    AND wi.commission_id = c.id
    AND c.status = 'earned';

  UPDATE public.affiliate_withdrawals
  SET status = 'paid',
      paid_at = now(),
      payout_txn_id = trim(p_payout_txn_id),
      admin_note = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), admin_note),
      reviewed_by = coalesce(reviewed_by, auth.uid())
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true, 'message', 'Payout confirmed');
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_withdrawals_select_own ON public.affiliate_withdrawals;
CREATE POLICY affiliate_withdrawals_select_own
  ON public.affiliate_withdrawals FOR SELECT
  USING (client_id = auth.uid() OR public.scriptora_is_admin());

DROP POLICY IF EXISTS affiliate_withdrawal_items_select_own ON public.affiliate_withdrawal_items;
CREATE POLICY affiliate_withdrawal_items_select_own
  ON public.affiliate_withdrawal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliate_withdrawals w
      WHERE w.id = withdrawal_id
        AND (w.client_id = auth.uid() OR public.scriptora_is_admin())
    )
  );

-- Mutations only via SECURITY DEFINER RPC functions
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_withdrawals FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_withdrawal_items FROM authenticated, anon;

GRANT SELECT ON public.affiliate_withdrawals TO authenticated;
GRANT SELECT ON public.affiliate_withdrawal_items TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_affiliate_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal(numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_affiliate_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_affiliate_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_affiliate_payout(uuid, text, text) TO authenticated;
