CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  changed_by  uuid REFERENCES public.profiles(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_status_history_lead
  ON public.lead_status_history (lead_id, created_at DESC);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- Fires on every lead status change and writes an audit row
CREATE OR REPLACE FUNCTION public.record_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lead_status_audit
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.record_lead_status_change();

-- All staff roles can read the audit trail
CREATE POLICY "staff_read_history"
  ON public.lead_status_history FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'agent', 'dispatch'));

-- The trigger function runs as SECURITY DEFINER, so the INSERT happens as
-- the function owner and bypasses RLS. No explicit INSERT policy is needed.
