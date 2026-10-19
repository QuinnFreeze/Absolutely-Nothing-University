import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export function runReleaseGateTests() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'anu-release-gate-'));
  const gate = fileURLToPath(new URL('../worker/scripts/release-gate.mjs', import.meta.url));
  const backup = path.join(temp, 'backup.sql');
  const contents = '-- synthetic backup\n';
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  const clean = { ...process.env };
  delete clean.ANU_PRODUCTION_APPROVED;
  delete clean.ANU_VERIFIED_BACKUP;
  const run = (extra = {}, action = 'deploy') => spawnSync(process.execPath, [gate, action], { cwd: temp, env: { ...clean, ...extra }, encoding: 'utf8' });
  try {
    fs.writeFileSync(backup, contents, { mode: 0o600 });
    fs.writeFileSync(backup + '.sha256', hash + '  backup.sql\n');
    assert.equal(run().status, 1, 'No approval must block');
    assert.equal(run({ ANU_PRODUCTION_APPROVED: '1' }).status, 1, 'Missing backup must block');
    const env = { ANU_PRODUCTION_APPROVED: '1', ANU_VERIFIED_BACKUP: backup };
    fs.chmodSync(backup, 0o644);
    assert.equal(run(env).status, 1, 'Public-readable backup must block');
    fs.chmodSync(backup, 0o600);
    const old = new Date(Date.now() - 7200000);
    fs.utimesSync(backup, old, old);
    assert.equal(run(env).status, 1, 'Stale backup must block');
    fs.utimesSync(backup, new Date(), new Date());
    fs.writeFileSync(backup + '.sha256', '0'.repeat(64));
    assert.equal(run(env).status, 1, 'Wrong checksum must block');
    fs.writeFileSync(backup + '.sha256', hash + '  backup.sql\n');
    const bin = path.join(temp, 'node_modules/.bin');
    fs.mkdirSync(bin, { recursive: true });
    // The only successful path invokes this disposable stub, never real Wrangler.
    fs.writeFileSync(path.join(bin, 'wrangler'), '#!/bin/sh\nprintf "%s\\n" "$@" > invocation.txt\n', { mode: 0o700 });
    assert.equal(run(env).status, 0);
    assert.equal(fs.readFileSync(path.join(temp, 'invocation.txt'), 'utf8'), 'deploy\n--config\nwrangler.toml\n');
    assert.equal(run(env, 'migrate').status, 0);
    assert.equal(fs.readFileSync(path.join(temp, 'invocation.txt'), 'utf8'), 'd1\nmigrations\napply\nanu-campus-db\n--config\nwrangler.toml\n--remote\n');
    console.log('✓ [LOCAL / CLI STUB PASS] Production release gate rejects missing approval, non-private/stale/corrupt backups; approved paths target the explicit production config');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runReleaseGateTests();
