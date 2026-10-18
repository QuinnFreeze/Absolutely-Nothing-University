-- Enforce archive capacity at the SQLite write boundary so concurrent direct
-- submissions and imports cannot exceed per-student limits. Duplicate imports
-- remain valid at capacity because they do not create another archive record.
-- RAISE(ABORT) also aborts an INSERT OR IGNORE; D1 batch rolls back the whole
-- transaction when any one of these guards rejects a new record.

CREATE TRIGGER IF NOT EXISTS enforce_transcript_quota
BEFORE INSERT ON transcripts
WHEN NOT EXISTS (
  SELECT 1 FROM transcripts
  WHERE firebase_uid = NEW.firebase_uid AND dedupe_hash = NEW.dedupe_hash
)
AND (SELECT COUNT(*) FROM transcripts WHERE firebase_uid = NEW.firebase_uid) >= 50
BEGIN
  SELECT RAISE(ABORT, 'ANU_TRANSCRIPT_LIMIT_REACHED');
END;

CREATE TRIGGER IF NOT EXISTS enforce_paper_quota
BEFORE INSERT ON papers
WHEN NOT EXISTS (
  SELECT 1 FROM papers
  WHERE firebase_uid = NEW.firebase_uid AND dedupe_hash = NEW.dedupe_hash
)
AND (SELECT COUNT(*) FROM papers WHERE firebase_uid = NEW.firebase_uid) >= 30
BEGIN
  SELECT RAISE(ABORT, 'ANU_PAPER_LIMIT_REACHED');
END;

CREATE TRIGGER IF NOT EXISTS enforce_diploma_quota
BEFORE INSERT ON diplomas
WHEN NOT EXISTS (
  SELECT 1 FROM diplomas
  WHERE firebase_uid = NEW.firebase_uid AND dedupe_hash = NEW.dedupe_hash
)
AND (SELECT COUNT(*) FROM diplomas WHERE firebase_uid = NEW.firebase_uid) >= 20
BEGIN
  SELECT RAISE(ABORT, 'ANU_DIPLOMA_LIMIT_REACHED');
END;
