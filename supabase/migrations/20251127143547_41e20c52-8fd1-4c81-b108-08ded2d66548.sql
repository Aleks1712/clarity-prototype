-- Add requires_approval preference to profiles
-- Default false means automatic approval (most flexible for parents)
ALTER TABLE profiles
ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.requires_approval IS 'If true, pickup requests from this parent require manual staff approval. If false (default), pickups are auto-approved for maximum flexibility.';