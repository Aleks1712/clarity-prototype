-- Add completed_at column to pickup_logs table
ALTER TABLE pickup_logs
ADD COLUMN completed_at timestamp with time zone;

-- Add comment explaining the column
COMMENT ON COLUMN pickup_logs.completed_at IS 'Timestamp when the child was actually picked up and marked as completed by staff';