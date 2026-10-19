import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function runReleaseGateTests() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'anu-release-gate-'));
  const repository = path.join(temp, 'repo');
  const worker = path.join(repository, 'worker');
  const scripts = path.join(worker, 'scripts');
  const gate = path.join(scripts, 'release-gate.mjs');
  const backupScript = path.join(scripts, 'backup-restore.sh');
  const invocations = path.join(worker, 'invocations.jsonl');
  const backup = path.join(temp, 'private-backup.sql');
  const contents = '-- synthetic backup fixture only\n';
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  const clean = { ...process.env };
  delete clean.ANU_PRODUCTION_APPROVED;
  delete clean.ANU_VERIFIED_BACKUP;
  delete clean.ANU_BACKUP_DIR;
  const run = (extra = {}, action = 'deploy') => spawnSync(process.execPath, [gate, action], {
    cwd: worker, env: { ...clean, ...extra }, encoding: 'utf8'
  });
  const exportBackup = (directory, extra = {}) => spawnSync('bash', [backupScript, 'backup'], {
    cwd: worker, env: { ...clean, ANU_BACKUP_DIR: directory, ...extra }, encoding: 'utf8'
  });
  const calls = () => fs.existsSync(invocations)
    ? fs.readFileSync(invocations, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
  const writeBackup = (file) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
    fs.writeFileSync(file + '.sha256', hash + '  ' + path.basename(file) + '\n', { mode: 0o600 });
  };
  try {
    // A disposable repository layout runs byte-for-byte copies of the actual
    // scripts. Every possible successful CLI invocation resolves to this stub.
    fs.mkdirSync(path.join(repository, '.git'), { recursive: true });
    fs.mkdirSync(scripts, { recursive: true });
    fs.chmodSync(repository, 0o755);
    fs.copyFileSync(fileURLToPath(new URL('../worker/scripts/release-gate.mjs', import.meta.url)), gate);
    fs.copyFileSync(fileURLToPath(new URL('../worker/scripts/backup-restore.sh', import.meta.url)), backupScript);
    const bin = path.join(worker, 'node_modules/.bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'wrangler'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(path.join(process.cwd(), 'invocations.jsonl'), JSON.stringify(args) + '\\n');
const output = args.find((arg) => arg.startsWith('--output='));
if (output) fs.writeFileSync(output.slice('--output='.length), ${JSON.stringify(contents)}, { mode: 0o600 });
`, { mode: 0o700 });
    writeBackup(backup);
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
    fs.writeFileSync(backup + '.sha256', hash + '  private-backup.sql\n');
    assert.equal(run(env).status, 0);
    assert.deepEqual(calls().at(-1), ['deploy', '--config', 'wrangler.toml']);
    assert.equal(run(env, 'migrate').status, 0);
    assert.deepEqual(calls().at(-1), ['d1', 'migrations', 'apply', 'anu-campus-db', '--config', 'wrangler.toml', '--remote']);

    const inside = path.join(repository, 'private', 'inside.sql');
    writeBackup(inside);
    const rootFile = path.join(repository, 'root-backup.sql');
    writeBackup(rootFile);
    const directoryAlias = path.join(temp, 'alias-to-repository');
    fs.symlinkSync(repository, directoryAlias, 'dir');
    const fileAlias = path.join(temp, 'alias-to-inside.sql');
    fs.symlinkSync(inside, fileAlias, 'file');
    fs.symlinkSync(inside + '.sha256', fileAlias + '.sha256', 'file');
    const insideAlias = path.join(repository, 'alias-to-external.sql');
    fs.symlinkSync(backup, insideAlias, 'file');
    fs.symlinkSync(backup + '.sha256', insideAlias + '.sha256', 'file');
    const beforePathRejections = calls().length;
    for (const file of [repository, rootFile, inside, path.join(directoryAlias, 'private', 'inside.sql'), fileAlias, insideAlias]) {
      const rejected = run({ ...env, ANU_VERIFIED_BACKUP: file });
      assert.equal(rejected.status, 1, 'The gate must independently reject repository paths and symlink targets');
    }
    assert.equal(calls().length, beforePathRejections, 'Rejected backup paths must never reach Wrangler');
    // Checksum writes/reads also cannot be redirected into tracked locations.
    const sidecarAlias = path.join(temp, 'sidecar-alias-backup.sql');
    fs.writeFileSync(sidecarAlias, contents, { mode: 0o600 });
    fs.symlinkSync(inside + '.sha256', sidecarAlias + '.sha256', 'file');
    assert.equal(run({ ...env, ANU_VERIFIED_BACKUP: sidecarAlias }).status, 1);

    const missingInside = path.join(repository, 'must-not-be-created', 'child');
    const nestedAlias = path.join(temp, 'alias-to-private-child');
    fs.symlinkSync(path.dirname(inside), nestedAlias, 'dir');
    const danglingAlias = path.join(temp, 'dangling-alias-to-repository');
    fs.symlinkSync(path.join(repository, 'dangling-target'), danglingAlias, 'dir');
    for (const directory of [repository, path.dirname(inside), missingInside, directoryAlias, path.join(directoryAlias, 'new-child'),
      nestedAlias + '/../traversed-child', danglingAlias]) {
      const rejected = exportBackup(directory);
      assert.equal(rejected.status, 1, 'The export helper must refuse repository paths before mkdir or chmod');
    }
    assert.equal(fs.existsSync(path.join(repository, 'must-not-be-created')), false, 'Validation must precede directory creation');
    assert.equal(fs.existsSync(path.join(repository, 'new-child')), false, 'Symlink ancestors must be resolved before directory creation');
    assert.equal(fs.existsSync(path.join(repository, 'traversed-child')), false, 'Resolve symlinks before collapsing parent traversal');
    assert.equal(fs.existsSync(path.join(repository, 'dangling-target')), false, 'Dangling links must not create an in-repository target');
    assert.equal(fs.statSync(repository).mode & 0o777, 0o755, 'A rejected repository root must not be chmodded');
    assert.equal(calls().length, beforePathRejections, 'Rejected exports must never invoke even the disposable Wrangler stub');

    // Existing output-file and checksum symlinks must be refused before export.
    const tools = path.join(temp, 'tools');
    fs.mkdirSync(tools);
    fs.writeFileSync(path.join(tools, 'date'), '#!/bin/sh\nprintf "%s\\n" "20261019T000000Z"\n', { mode: 0o700 });
    const redirected = path.join(temp, 'redirected-export');
    fs.mkdirSync(redirected);
    const expectedOutput = path.join(redirected, 'anu-campus-db-20261019T000000Z.sql');
    fs.symlinkSync(inside, expectedOutput, 'file');
    const fixedClock = { PATH: tools + path.delimiter + process.env.PATH };
    assert.equal(exportBackup(redirected, fixedClock).status, 1);
    fs.unlinkSync(expectedOutput);
    fs.symlinkSync(inside + '.sha256', expectedOutput + '.sha256', 'file');
    assert.equal(exportBackup(redirected, fixedClock).status, 1);
    assert.equal(fs.existsSync(expectedOutput), false, 'A rejected checksum target must not create a SQL backup');
    assert.equal(calls().length, beforePathRejections);
    assert.equal(fs.readFileSync(inside, 'utf8'), contents, 'Rejected symlinks must never overwrite repository files');

    // A neighboring path sharing the repository's name is outside the repo.
    const adjacent = path.join(temp, 'repo-neighbor with spaces');
    const exported = exportBackup(adjacent);
    assert.equal(exported.status, 0, exported.stderr);
    const sql = fs.readdirSync(adjacent).filter((name) => name.endsWith('.sql'));
    assert.equal(sql.length, 1);
    const exportedFile = path.join(adjacent, sql[0]);
    assert.equal(fs.readFileSync(exportedFile, 'utf8'), contents);
    assert.equal(fs.statSync(exportedFile).mode & 0o077, 0);
    assert.equal(fs.statSync(adjacent).mode & 0o777, 0o700);
    assert.equal(fs.readFileSync(exportedFile + '.sha256', 'utf8').trim().split(/\s+/)[0], hash);
    assert.equal(run({ ...env, ANU_VERIFIED_BACKUP: exportedFile }).status, 0, 'A valid adjacent-prefix backup must pass the independent gate');
    assert.deepEqual(calls().at(-1), ['deploy', '--config', 'wrangler.toml']);
    console.log('✓ [LOCAL / CLI STUB PASS] Release and export gates reject missing approval, unsafe/stale/corrupt backups, repository roots/children and symlink targets before mkdir or CLI; adjacent-prefix directories remain usable');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runReleaseGateTests();
