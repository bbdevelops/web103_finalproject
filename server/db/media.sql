CREATE TABLE IF NOT EXISTS quest_images (
  quest_id integer PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
  public_id text NOT NULL UNIQUE,
  secure_url text NOT NULL CHECK (secure_url LIKE 'https://%'),
  alt_text text NOT NULL CHECK (length(btrim(alt_text)) BETWEEN 1 AND 200),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_deletion_jobs (
  public_id text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
