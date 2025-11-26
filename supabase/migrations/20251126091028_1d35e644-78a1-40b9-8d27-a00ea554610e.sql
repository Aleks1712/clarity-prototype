-- Allow users to change their own role from parent during onboarding
CREATE POLICY "Users can update their own initial role"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND role = 'parent');

-- Allow users to delete their parent role during onboarding
CREATE POLICY "Users can delete their own parent role"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND role = 'parent');

-- Allow users to insert their chosen role during onboarding
CREATE POLICY "Users can insert their chosen role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);