CREATE TABLE IF NOT EXISTS chat_sessions(user_id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS chat_sessions_token_idx ON chat_sessions(token_hash);
CREATE TABLE IF NOT EXISTS chat_messages(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL,username TEXT NOT NULL,content TEXT NOT NULL CHECK(char_length(content)<=2000),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at);
