-- ============================================================================
-- ANU (Absolutely Nothing University) · Cloudflare D1 Initial Schema Migration
-- Migration: 0001_initial_schema.sql
-- Security guarantees:
--   1. Every Firebase UID maps to at most ONE student profile (PRIMARY KEY).
--   2. Every ANU Student ID is globally unique (UNIQUE constraint).
--   3. Default profile visibility is strictly 'private'.
--   4. Public consent requires explicit boolean flag + timestamp.
--   5. Idempotency keys prevent duplicate imports and concurrent duplicate writes.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. System Feature Switches (Admin Kill-Switches for Emergency Protection)
-- Note: new registrations default to paused (0) in production until security tests pass,
-- or can be toggled via authenticated Admin API / D1 console.
CREATE TABLE IF NOT EXISTS system_flags (
  flag_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by TEXT NOT NULL DEFAULT 'system',
  note TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO system_flags (flag_key, enabled, note) VALUES
  ('registration_enabled', 1, 'Master switch for new student profile registrations'),
  ('paper_submission_enabled', 1, 'Master switch for zero-word paper submissions'),
  ('diploma_registration_enabled', 1, 'Master switch for honorary diploma registrations'),
  ('public_directory_enabled', 1, 'Master switch for public student profile lookup');

-- 2. Students Table (1-to-1 with verified Firebase UID)
CREATE TABLE IF NOT EXISTS students (
  firebase_uid TEXT PRIMARY KEY CHECK (length(firebase_uid) >= 6 AND length(firebase_uid) <= 128),
  student_number TEXT NOT NULL UNIQUE CHECK (student_number GLOB 'ANU-[0-9][0-9][0-9][0-9]-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'),
  nickname TEXT NOT NULL CHECK (length(trim(nickname)) >= 1 AND length(nickname) <= 36),
  avatar_seed TEXT NOT NULL DEFAULT 'crest-oxford' CHECK (length(avatar_seed) <= 64),
  avatar_url TEXT NOT NULL DEFAULT '' CHECK (length(avatar_url) <= 512),
  college TEXT NOT NULL CHECK (college IN ('retreat', 'procrastination', 'perfunctory', 'daydream')),
  major TEXT NOT NULL CHECK (length(trim(major)) >= 1 AND length(major) <= 80),
  enrollment_year INTEGER NOT NULL CHECK (enrollment_year >= -9999 AND enrollment_year <= 2100),
  enrollment_date TEXT NOT NULL CHECK (length(enrollment_date) <= 32),
  fictional_honor TEXT NOT NULL CHECK (length(trim(fictional_honor)) >= 1 AND length(fictional_honor) <= 120),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  public_consent INTEGER NOT NULL DEFAULT 0 CHECK (public_consent IN (0, 1)),
  public_consent_at TEXT,
  terms_accepted_at TEXT NOT NULL,
  privacy_accepted_at TEXT NOT NULL,
  idle_seconds INTEGER NOT NULL DEFAULT 0 CHECK (idle_seconds >= 0 AND idle_seconds <= 9999999999),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK (visibility = 'private' OR (visibility = 'public' AND public_consent = 1 AND public_consent_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_visibility ON students(visibility);

-- 3. Transcripts Table (Server-graded Mock Exam Results)
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  course_code TEXT NOT NULL CHECK (course_code IN ('NTH-101', 'NTH-104', 'PRC-202', 'PRC-208', 'PRF-305', 'PRF-309', 'DRM-404', 'DRM-499')),
  course_title_zh TEXT NOT NULL,
  course_title_en TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'B+', 'F')),
  grade_label_zh TEXT NOT NULL,
  grade_label_en TEXT NOT NULL,
  verdict_zh TEXT NOT NULL,
  verdict_en TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  dedupe_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (firebase_uid) REFERENCES students(firebase_uid) ON DELETE CASCADE,
  UNIQUE (firebase_uid, dedupe_hash)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_uid_created ON transcripts(firebase_uid, created_at DESC);

-- 4. Blank Papers Archive (Student Zero-Word Manuscripts)
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  void_id TEXT NOT NULL UNIQUE CHECK (void_id GLOB 'VOID-ID: ANU.NULL.*'),
  title TEXT NOT NULL CHECK (length(trim(title)) >= 1 AND length(title) <= 120),
  author_display TEXT NOT NULL CHECK (length(trim(author_display)) >= 1 AND length(author_display) <= 80),
  journal_idx INTEGER NOT NULL CHECK (journal_idx >= 0 AND journal_idx <= 10),
  journal_zh TEXT NOT NULL,
  journal_en TEXT NOT NULL,
  methodology_idx INTEGER NOT NULL CHECK (methodology_idx >= 0 AND methodology_idx <= 10),
  content_zh TEXT NOT NULL,
  content_en TEXT NOT NULL,
  footnote_zh TEXT NOT NULL,
  footnote_en TEXT NOT NULL,
  reviewer_header_zh TEXT NOT NULL,
  reviewer_header_en TEXT NOT NULL,
  review_zh TEXT NOT NULL,
  review_en TEXT NOT NULL,
  citations_zh TEXT NOT NULL,
  citations_en TEXT NOT NULL,
  dedupe_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (firebase_uid) REFERENCES students(firebase_uid) ON DELETE CASCADE,
  UNIQUE (firebase_uid, dedupe_hash)
);

CREATE INDEX IF NOT EXISTS idx_papers_uid_created ON papers(firebase_uid, created_at DESC);

-- 5. Honorary Diplomas & Certificates
CREATE TABLE IF NOT EXISTS diplomas (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE CHECK (serial_number GLOB 'ANU-[0-9][0-9][0-9][0-9]-VOID-[A-Z0-9]*'),
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) >= 1 AND length(recipient_name) <= 48),
  degree_idx INTEGER NOT NULL CHECK (degree_idx >= 0 AND degree_idx <= 15),
  degree_zh TEXT NOT NULL,
  degree_en TEXT NOT NULL,
  major_idx INTEGER NOT NULL CHECK (major_idx >= 0 AND major_idx <= 20),
  major_zh TEXT NOT NULL,
  major_en TEXT NOT NULL,
  honor_idx INTEGER NOT NULL CHECK (honor_idx >= 0 AND honor_idx <= 15),
  honor_zh TEXT NOT NULL,
  honor_en TEXT NOT NULL,
  citation_idx INTEGER NOT NULL CHECK (citation_idx >= 0 AND citation_idx <= 15),
  template_id TEXT NOT NULL CHECK (template_id IN ('oxford', 'parchment', 'minimal')),
  cert_lang TEXT NOT NULL CHECK (cert_lang IN ('auto', 'zh', 'en', 'bilingual')),
  is_stamped INTEGER NOT NULL DEFAULT 1 CHECK (is_stamped IN (0, 1)),
  issued_date TEXT NOT NULL,
  dedupe_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (firebase_uid) REFERENCES students(firebase_uid) ON DELETE CASCADE,
  UNIQUE (firebase_uid, dedupe_hash)
);

CREATE INDEX IF NOT EXISTS idx_diplomas_uid_created ON diplomas(firebase_uid, created_at DESC);

-- 6. Honors, Achievements & Club Memberships
CREATE TABLE IF NOT EXISTS honors_achievements (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  badge_key TEXT NOT NULL CHECK (length(badge_key) >= 2 AND length(badge_key) <= 64),
  badge_category TEXT NOT NULL CHECK (badge_category IN ('honor', 'club', 'easter_egg', 'milestone')),
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  desc_zh TEXT NOT NULL,
  desc_en TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (firebase_uid) REFERENCES students(firebase_uid) ON DELETE CASCADE,
  UNIQUE (firebase_uid, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_honors_uid ON honors_achievements(firebase_uid);

-- 7. Rate Limiting Buckets (IP and Account Dimensions)
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- 8. Idempotency & Import Ledger (Prevents duplicate imports & concurrent replays)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idem_key TEXT NOT NULL,
  firebase_uid TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (firebase_uid, idem_key, endpoint),
  FOREIGN KEY (firebase_uid) REFERENCES students(firebase_uid) ON DELETE CASCADE
);

-- 9. Security & Admin Audit Log (No PII or credentials stored)
CREATE TABLE IF NOT EXISTS security_audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at DESC);
