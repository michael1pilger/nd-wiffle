-- v103: reusable commissioner social-graphics templates
CREATE TABLE IF NOT EXISTS graphic_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_graphic_templates_updated_at
  ON graphic_templates(updated_at DESC);
