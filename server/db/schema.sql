CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  github_id text NOT NULL UNIQUE,
  github_username text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE skill_trees (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL CHECK (btrim(description) <> '')
);

CREATE TABLE quests (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  skill_tree_id integer NOT NULL REFERENCES skill_trees(id) ON DELETE RESTRICT,
  created_by_user_id integer REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  requirements text NOT NULL CHECK (btrim(requirements) <> ''),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  xp_reward integer NOT NULL CHECK (xp_reward >= 0),
  position integer NOT NULL CHECK (position >= 0),
  prerequisite_notes text,
  tech_stack_tags text[] NOT NULL DEFAULT '{}',
  documentation_urls text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX quests_tree_order_idx ON quests(skill_tree_id, position, id);

CREATE TABLE user_quests (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id integer NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'completed')),
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  completed_at timestamptz,
  notes text,
  repository_url text,
  PRIMARY KEY (user_id, quest_id),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL AND xp_earned = 0)
  )
);

CREATE INDEX user_quests_quest_idx ON user_quests(quest_id);
