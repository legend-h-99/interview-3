CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  national_id TEXT NOT NULL UNIQUE,
  request_no TEXT NOT NULL UNIQUE,
  waiting_no TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  gpa REAL NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  committee_id TEXT,
  interview_at TEXT,
  documents_json TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  final_result TEXT,
  audit_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_national_id ON applicants (national_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_request_no ON applicants (request_no);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants (status);

CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions (expires_at);
