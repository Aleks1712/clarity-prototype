-- Create attendance_logs table for check-in/check-out
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
  checked_out_at timestamp with time zone,
  checked_in_by uuid REFERENCES auth.users(id),
  checked_out_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Employees and admins can view all attendance logs
CREATE POLICY "Employees can view all attendance logs"
  ON public.attendance_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'employee'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Parents can view their own children's attendance
CREATE POLICY "Parents can view their children's attendance"
  ON public.attendance_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_children
      WHERE parent_children.child_id = attendance_logs.child_id
        AND parent_children.parent_id = auth.uid()
    )
  );

-- Employees can insert attendance logs
CREATE POLICY "Employees can insert attendance logs"
  ON public.attendance_logs
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'employee'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Employees can update attendance logs (for check-out)
CREATE POLICY "Employees can update attendance logs"
  ON public.attendance_logs
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'employee'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create index for faster queries
CREATE INDEX idx_attendance_logs_child_id ON public.attendance_logs(child_id);
CREATE INDEX idx_attendance_logs_checked_in_at ON public.attendance_logs(checked_in_at);

-- Enable realtime for attendance_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;