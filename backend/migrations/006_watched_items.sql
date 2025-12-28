-- Watched history items (TMDB)

CREATE TABLE IF NOT EXISTS watched_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_type, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_watched_items_user_id ON watched_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_items_media_tmdb ON watched_items(media_type, tmdb_id);
