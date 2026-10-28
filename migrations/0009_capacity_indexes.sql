-- Additive indexes only; no user data changes.
CREATE INDEX IF NOT EXISTS photos_user_id_id_idx ON photos (user_id, id);
CREATE INDEX IF NOT EXISTS messages_match_id_id_idx ON messages (match_id, id);
CREATE INDEX IF NOT EXISTS matches_sender_recipient_idx ON matches (user1_id, user2_id);
CREATE INDEX IF NOT EXISTS blocks_sender_recipient_idx ON blocked_users (user_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS blocks_recipient_sender_idx ON blocked_users (blocked_user_id, user_id);
