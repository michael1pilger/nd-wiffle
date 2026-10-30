-- Allow ND Wiffle accounts that are not linked to an active player.
-- Existing player accounts are preserved.
-- Run this migration after 0034 on existing databases.

PRAGMA foreign_keys = OFF;

CREATE TABLE user_accounts_v2 (
  user_id TEXT PRIMARY KEY,
  player_id TEXT UNIQUE REFERENCES players(player_id),
  display_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'player' CHECK (account_type IN ('player','guest')),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  starter_tokens_granted INTEGER NOT NULL DEFAULT 0 CHECK (starter_tokens_granted IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  CHECK (
    (account_type='player' AND player_id IS NOT NULL)
    OR
    (account_type='guest' AND player_id IS NULL AND display_name IS NOT NULL AND length(trim(display_name)) BETWEEN 2 AND 40)
  )
);

INSERT INTO user_accounts_v2(
  user_id,player_id,display_name,account_type,email,password_salt,password_hash,password_iterations,
  token_balance,starter_tokens_granted,active,created_at,last_login_at
)
SELECT
  user_id,player_id,NULL,'player',email,password_salt,password_hash,password_iterations,
  token_balance,starter_tokens_granted,active,created_at,last_login_at
FROM user_accounts;

DROP TABLE user_accounts;
ALTER TABLE user_accounts_v2 RENAME TO user_accounts;

CREATE INDEX IF NOT EXISTS idx_user_accounts_player ON user_accounts(player_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_type ON user_accounts(account_type);

PRAGMA foreign_keys = ON;
