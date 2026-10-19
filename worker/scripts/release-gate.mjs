// Explicit operator gate for production mutations; dry runs do not need this gate.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const action = process.argv[2];
function fail(message) { console.error(message); process.exit(1); }
if (!['deploy', 'migrate'].includes(action)) fail('Expected deploy or migrate.');
if (process.env.ANU_PRODUCTION_APPROVED !== '1') fail('Production change blocked. Review docs/PRODUCTION_ROLLOUT.md, then explicitly set ANU_PRODUCTION_APPROVED=1 for an approved release.');
const backup = process.env.ANU_VERIFIED_BACKUP;
if (!backup || !path.isAbsolute(backup)) fail('Set ANU_VERIFIED_BACKUP to a fresh private SQL backup.');
try {
  const stat = fs.statSync(backup);
  if (!stat.size || Date.now() - stat.mtimeMs > 3600000) fail('Backup must be nonempty and less than one hour old.');
  if ((stat.mode & 0o077) !== 0) fail('Backup must be private (chmod 600).');
  const expected = fs.readFileSync(backup + '.sha256', 'utf8').trim().split(/\s+/)[0];
  const actual = crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex');
  if (expected !== actual) fail('Backup checksum mismatch.');
} catch { fail('Cannot verify private backup and its SHA-256 file.'); }
const args = action === 'deploy' ? ['deploy', '--config', 'wrangler.toml']
  : ['d1', 'migrations', 'apply', 'anu-campus-db', '--config', 'wrangler.toml', '--remote'];
const result = spawnSync(path.resolve('node_modules/.bin/wrangler'), args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
