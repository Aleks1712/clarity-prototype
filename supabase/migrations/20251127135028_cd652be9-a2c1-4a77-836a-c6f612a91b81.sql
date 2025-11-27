-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM chat_messages
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;