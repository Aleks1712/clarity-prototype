-- Fix critical security vulnerabilities

-- 1. FIX PRIVILEGE ESCALATION: Users should only be able to insert 'parent' role for themselves
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Users can insert their chosen role" ON user_roles;

-- Create restricted policy: Users can only insert 'parent' role for themselves
CREATE POLICY "Users can insert parent role only" ON user_roles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'parent'::app_role
);

-- 2. FIX PROFILE EXPOSURE: Change SELECT policy to limit visibility
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create restricted policy: Users can only see their own profile, employees/admins can see all
CREATE POLICY "Users can view relevant profiles" ON profiles
FOR SELECT USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'employee'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. ADD MISSING INSERT POLICY for profiles (safety net if trigger fails)
CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. CREATE TABLE FOR CHAT MESSAGES (with auto-deletion support)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role app_role NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat policies: Parents can see messages for their children, employees can see all
CREATE POLICY "Parents can view chat for their children" ON chat_messages
FOR SELECT USING (
  (sender_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM parent_children 
      WHERE parent_children.child_id = chat_messages.child_id 
      AND parent_children.parent_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'employee'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Parents can send messages for their children
CREATE POLICY "Parents can send chat messages" ON chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    sender_role = 'parent'::app_role
    AND EXISTS (
      SELECT 1 FROM parent_children 
      WHERE parent_children.child_id = chat_messages.child_id 
      AND parent_children.parent_id = auth.uid()
    )
  )
);

-- Employees can send messages
CREATE POLICY "Employees can send chat messages" ON chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    has_role(auth.uid(), 'employee'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 5. ADD estimated_arrival_time to pickup_logs
ALTER TABLE public.pickup_logs 
ADD COLUMN IF NOT EXISTS estimated_arrival_time timestamp with time zone;

-- 6. CREATE FUNCTION to auto-delete old chat messages (24 hours)
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM chat_messages
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- 7. Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;