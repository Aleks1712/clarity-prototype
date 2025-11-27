-- Add DELETE policy for admins on children table
CREATE POLICY "Admins can delete children"
ON public.children
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));