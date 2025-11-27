-- Add consent fields to authorized_pickups table
ALTER TABLE authorized_pickups
ADD COLUMN consent_given boolean DEFAULT false NOT NULL,
ADD COLUMN consent_date timestamp with time zone,
ADD COLUMN added_by uuid REFERENCES auth.users(id);

-- Update existing records to have consent_given = true (grandfather existing data)
UPDATE authorized_pickups SET consent_given = true, consent_date = created_at WHERE consent_given = false;

-- Add index for faster queries
CREATE INDEX idx_authorized_pickups_consent ON authorized_pickups(child_id, consent_given);

COMMENT ON COLUMN authorized_pickups.consent_given IS 'Explicit parental consent for this person to pick up the child';
COMMENT ON COLUMN authorized_pickups.consent_date IS 'When the parent gave consent for this person';
COMMENT ON COLUMN authorized_pickups.added_by IS 'Which parent added and consented to this authorized pickup person';