-- Add foreign key constraint from chat_messages to profiles
-- This allows us to join chat messages with sender names
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;