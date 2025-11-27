-- Add preferred_language to profiles
-- Stores user's language preference for the app interface
ALTER TABLE profiles
ADD COLUMN preferred_language text NOT NULL DEFAULT 'nb';

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language code (nb=Norwegian, en=English, pl=Polish, so=Somali, ar=Arabic, ur=Urdu)';