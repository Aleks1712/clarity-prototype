-- Create role enum
CREATE TYPE public.app_role AS ENUM ('parent', 'employee', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birth_date DATE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Create parent_children junction table
CREATE TABLE public.parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

-- Create authorized_pickups table
CREATE TABLE public.authorized_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.authorized_pickups ENABLE ROW LEVEL SECURITY;

-- Create pickup_logs table
CREATE TABLE public.pickup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_person_name TEXT NOT NULL,
  pickup_person_id UUID REFERENCES public.authorized_pickups(id),
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

ALTER TABLE public.pickup_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for children
CREATE POLICY "Parents can view their children"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_children
      WHERE parent_children.child_id = children.id
      AND parent_children.parent_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for parent_children
CREATE POLICY "Parents can view their own relationships"
  ON public.parent_children FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for authorized_pickups
CREATE POLICY "Parents and employees can view authorized pickups"
  ON public.authorized_pickups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_children
      WHERE parent_children.child_id = authorized_pickups.child_id
      AND parent_children.parent_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for pickup_logs
CREATE POLICY "Parents can view their own pickup logs"
  ON public.pickup_logs FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_children
      WHERE parent_children.child_id = pickup_logs.child_id
      AND parent_children.parent_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Parents can create pickup logs for their children"
  ON public.pickup_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.parent_children
      WHERE parent_children.child_id = pickup_logs.child_id
      AND parent_children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update pickup logs"
  ON public.pickup_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'employee') OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for pickup_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_logs;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();