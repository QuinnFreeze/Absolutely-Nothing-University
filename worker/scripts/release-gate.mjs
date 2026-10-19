// Explicit operator gate for production mutations; dry runs do not need this gate.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const action = process.argv[2];
function fail(message) { console.error(message); process.exit(1); }
if (!['deploy', 'migrate'].includes(action)) fail('Expected deploy or migrate.');
if (process.env.ANU_PRODUCTION_APPROVED !== '1') fail('Production change blocked. Review docs/PRODUCTION_ROLLOUT.md, then explicitly set ANU_PRODUCTION_APPROVED=1 for an approved release.');
const repositoryRoot = fs.realpathSync.native(fileURLToPath(new URL('../..', import.meta.url)));
function isInRepository(candidate) {
  const relative = path.relative(repositoryRoot, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}
function assertExternalBackup(file) {
  // Check both directory entries and their real targets. A symlink from the
  // repository to an external file is still an in-repository backup entry.
  for (const candidate of [file, path.dirname(file), file + '.sha256']) {
    if (isInRepository(path.resolve(candidate)) || isInRepository(fs.realpathSync.native(candidate))) {
      fail('Backup must be outside the repository, including symbolic-link targets.');
    }
  }
}
const backup = process.env.ANU_VERIFIED_BACKUP;
if (!backup || !path.isAbsolute(backup)) fail('Set ANU_VERIFIED_BACKUP to a fresh private SQL backup.');
try {
  assertExternalBackup(backup);
  const stat = fs.statSync(backup);
  if (!stat.isFile()) fail('Backup must be a regular SQL file.');
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
