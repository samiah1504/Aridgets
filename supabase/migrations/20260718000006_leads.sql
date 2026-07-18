-- Monotonically increasing sequence for zero-padded order numbers
CREATE SEQUENCE IF NOT EXISTS public.lead_order_seq START 1;

-- Returns the next order number using the prefix from settings, e.g. "DD-000042"
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq    bigint;
BEGIN
  SELECT order_prefix INTO v_prefix FROM public.settings LIMIT 1;
  v_prefix := COALESCE(v_prefix, 'DD');
  v_seq    := nextval('public.lead_order_seq');
  RETURN v_prefix || '-' || LPAD(v_seq::text, 6, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  product_id       uuid NOT NULL REFERENCES public.products(id),
  name             text NOT NULL,
  phone            text NOT NULL,
  email            text,
  address          text NOT NULL,
  state            text NOT NULL,
  lga              text,
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price       integer NOT NULL CHECK (unit_price >= 0),
  total            integer NOT NULL CHECK (total >= 0),
  status           text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','buying','delivery','paid','not_buying')),
  assigned_to      uuid REFERENCES public.profiles(id),
  call_notes       text,

  -- Meta tracking identifiers captured at form submit
  fbp              text,
  fbc              text,
  fbclid           text,
  event_id_lead    text NOT NULL DEFAULT gen_random_uuid()::text,
  event_id_purchase text,           -- set when Purchase CAPI fires; null = not yet fired
  client_user_agent text,
  client_ip        text,

  -- UTM attribution
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  confirmed_at     timestamptz,
  dispatched_at    timestamptz,
  paid_at          timestamptz
);

CREATE INDEX idx_leads_product_id    ON public.leads (product_id);
CREATE INDEX idx_leads_status         ON public.leads (status);
CREATE INDEX idx_leads_phone          ON public.leads (phone);
CREATE INDEX idx_leads_order_number   ON public.leads (order_number);
CREATE INDEX idx_leads_assigned_to    ON public.leads (assigned_to);
CREATE INDEX idx_leads_created_at     ON public.leads (created_at DESC);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon from the order form) can INSERT a lead
CREATE POLICY "public_insert_leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Owner/admin: full access
CREATE POLICY "admin_manage_leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));

-- Agents: read all leads and update (call notes, status transitions)
CREATE POLICY "agent_read_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (get_user_role() = 'agent');

CREATE POLICY "agent_update_leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'agent')
  WITH CHECK (get_user_role() = 'agent');

-- Dispatch: view and update confirmed/delivery leads only
CREATE POLICY "dispatch_read_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'dispatch'
    AND status IN ('buying', 'delivery', 'paid')
  );

CREATE POLICY "dispatch_update_leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'dispatch'
    AND status IN ('buying', 'delivery')
  )
  WITH CHECK (get_user_role() = 'dispatch');
