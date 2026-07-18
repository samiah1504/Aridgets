CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  role       text NOT NULL DEFAULT 'agent'
                  CHECK (role IN ('owner', 'admin', 'agent', 'dispatch')),
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create a profile row whenever a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users see their own profile
CREATE POLICY "own_profile_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Owners and admins see every profile
CREATE POLICY "admin_profile_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'));

-- Owners can change any profile (e.g. promote agent to admin)
CREATE POLICY "owner_profile_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

-- Users can edit their own display name
CREATE POLICY "own_profile_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
