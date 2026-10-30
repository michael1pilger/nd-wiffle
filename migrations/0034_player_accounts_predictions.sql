-- Player accounts + virtual-token prediction markets.
-- Tokens are virtual league currency and have no cash value.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_accounts (
  user_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE REFERENCES players(player_id),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  starter_tokens_granted INTEGER NOT NULL DEFAULT 0 CHECK (starter_tokens_granted IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_player ON user_accounts(player_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS prediction_markets (
  market_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL DEFAULT 2026,
  title TEXT NOT NULL,
  market_type TEXT NOT NULL CHECK (market_type IN ('game_winner','series_winner','player_over_under')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','settled','void')),
  team_a_id TEXT REFERENCES teams(team_id),
  team_b_id TEXT REFERENCES teams(team_id),
  playoff_round TEXT,
  game_number INTEGER,
  player_id TEXT REFERENCES players(player_id),
  stat_key TEXT,
  line REAL,
  options_json TEXT NOT NULL,
  close_at TEXT NOT NULL,
  winning_option_key TEXT,
  result_value REAL,
  result_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  CHECK (team_a_id IS NULL OR team_b_id IS NULL OR team_a_id <> team_b_id),
  CHECK (game_number IS NULL OR game_number BETWEEN 1 AND 7)
);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON prediction_markets(status,close_at);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_pair ON prediction_markets(season,team_a_id,team_b_id);

CREATE TABLE IF NOT EXISTS prediction_wagers (
  wager_id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL REFERENCES prediction_markets(market_id),
  user_id TEXT NOT NULL REFERENCES user_accounts(user_id),
  option_key TEXT NOT NULL,
  option_label TEXT NOT NULL,
  stake INTEGER NOT NULL CHECK (stake > 0),
  decimal_odds REAL NOT NULL CHECK (decimal_odds >= 1.01),
  potential_payout INTEGER NOT NULL CHECK (potential_payout >= stake),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','won','lost','push','void')),
  payout INTEGER NOT NULL DEFAULT 0 CHECK (payout >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  UNIQUE(user_id,market_id)
);
CREATE INDEX IF NOT EXISTS idx_prediction_wagers_user ON prediction_wagers(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_prediction_wagers_market ON prediction_wagers(market_id,status);

CREATE TABLE IF NOT EXISTS token_ledger (
  ledger_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user_accounts(user_id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('starter','wager','win','push','void_refund','admin_adjustment')),
  market_id TEXT REFERENCES prediction_markets(market_id),
  wager_id TEXT REFERENCES prediction_wagers(wager_id),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_ledger_user ON token_ledger(user_id,created_at);
