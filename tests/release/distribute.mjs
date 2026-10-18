// Primary deterministic contract for local release staging and announcement.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packageRelease } from '../../scripts/release/prepare.mjs';
import { stageRelease, announceRelease } from '../../scripts/release/distribute.mjs';

const metadata = { version: '2.0.0', date: '2026-10-18', changes: ['核心更新。'] };
let passed = 0;
async function fixture(run) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mvu-distribute-'));
  const git = (...args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const candidateDir = path.join(rootDir, 'dist/mvu-release');
  const latestPath = path.join(rootDir, 'releases/mvu/latest.json');
  const commit = () => { git('add', '.'); git('commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  try {
    git('init'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    await mkdir(path.join(rootDir, 'src/MVU助手'), { recursive: true });
    await mkdir(path.join(rootDir, 'dist/MVU助手'), { recursive: true });
    await writeFile(path.join(rootDir, 'src/MVU助手/release.json'), JSON.stringify(metadata));
    await writeFile(path.join(rootDir, 'dist/MVU助手/index.js'), 'globalThis.fixtureExecutions = (globalThis.fixtureExecutions || 0) + 1;');
    await writeFile(path.join(rootDir, '.gitignore'), 'dist/\n');
    const sourceSha = commit();
    const candidate = await packageRelease({ rootDir, sourceSha, sourceDirty: false });
    const requests = [];
    const fetchImpl = async url => {
      requests.push(String(url));
      const match = /^https:\/\/cdn\.jsdelivr\.net\/gh\/Malkuku\/EraHelper-all-in-one-solution-for-ERA-scripts@([a-f0-9]{40})\/(releases\/mvu\/[^?]+)$/.exec(String(url));
      assert(match, `fixed repository and full artifact commit required: ${url}`);
      return new Response(execFileSync('git', ['show', `${match[1]}:${match[2]}`], { cwd: rootDir }), { status: 200 });
    };
    const options = { rootDir, candidateDir };
    const stage = () => stageRelease(options);
    const announce = (artifactCommit, extra = {}) => announceRelease({ rootDir, version: metadata.version, artifactCommit, fetchImpl, ...extra });
    await run({ rootDir, git, commit, sourceSha, candidateDir, candidate, latestPath, requests, stage, announce, options, fetchImpl });
    passed++;
  } finally { await rm(rootDir, { recursive: true, force: true }); }
}

await fixture(async ({ rootDir, stage, candidateDir, latestPath }) => {
  await stage();
  const destination = path.join(rootDir, 'releases/mvu/2.0.0');
  assert.deepEqual((await readdir(destination)).sort(), (await readdir(candidateDir)).sort());
  for (const filename of await readdir(candidateDir)) assert.deepEqual(await readFile(path.join(destination, filename)), await readFile(path.join(candidateDir, filename)));
  await assert.rejects(readFile(latestPath), { code: 'ENOENT' });
  await assert.rejects(stage, /存在|覆盖|EEXIST/);
});

await fixture(async ({ rootDir, candidateDir, sourceSha, stage }) => {
  await packageRelease({ rootDir, sourceSha, sourceDirty: true });
  await assert.rejects(stage, /dirty|未提交|干净|脏/i);
  await assert.rejects(readdir(path.join(rootDir, 'releases/mvu/2.0.0')), { code: 'ENOENT' });
  assert(await readFile(path.join(candidateDir, 'release.json')));
});
for (const filename of ['index.js', 'release.json', 'release-notes.md', 'SHA256SUMS']) {
  await fixture(async ({ candidateDir, stage }) => {
    await writeFile(path.join(candidateDir, filename), filename === 'release.json' ? '{}' : 'corrupt');
    await assert.rejects(stage);
  });
}
await fixture(async ({ candidateDir, stage }) => {
  await rm(path.join(candidateDir, 'index.js'));
  await assert.rejects(stage);
});

await fixture(async ({ stage, commit, sourceSha, candidate, announce, latestPath, requests }) => {
  await stage(); const artifactCommit = commit();
  assert.notEqual(artifactCommit, sourceSha);
  await announce(artifactCommit);
  const latest = JSON.parse(await readFile(latestPath, 'utf8'));
  assert.equal(latest.schemaVersion, 1);
  assert.equal(latest.latest, metadata.version);
  assert.deepEqual(latest.versions, [{ ...metadata, artifactCommit, sha256: candidate.files['index.js'] }]);
  assert(requests.some(url => url.endsWith('/index.js')));
  assert(requests.some(url => url.endsWith('/release.json')));
  const before = await readFile(latestPath);
  await announce(artifactCommit);
  assert.deepEqual(await readFile(latestPath), before, 'same publication is idempotent');
});

for (const invalid of ['short', 'A'.repeat(40), 'f'.repeat(40), 'a'.repeat(40) + '\n']) {
  await fixture(async ({ stage, commit, announce, latestPath }) => {
    await stage(); commit();
    await assert.rejects(() => announce(invalid));
    await assert.rejects(readFile(latestPath), { code: 'ENOENT' });
  });
}
await fixture(async ({ stage, commit, sourceSha, announce, latestPath }) => {
  await stage(); commit();
  await assert.rejects(() => announce(sourceSha));
  await assert.rejects(readFile(latestPath), { code: 'ENOENT' });
});

for (const failure of ['network', 'http', 'core-bytes', 'metadata-bytes']) {
  await fixture(async ({ stage, commit, announce, latestPath, fetchImpl }) => {
    await stage(); const artifactCommit = commit();
    const old = Buffer.from(JSON.stringify({ schemaVersion: 1, latest: '1.0.0', versions: [{ version: '1.0.0', date: '2026-10-17', changes: ['历史版本'], artifactCommit: '1'.repeat(40), sha256: '2'.repeat(64) }] }));
    await writeFile(latestPath, old);
    const failingFetch = async url => {
      if (failure === 'network') throw new Error('fixture network failure');
      if (failure === 'http') return new Response('unavailable', { status: 503 });
      if ((failure === 'core-bytes' && String(url).endsWith('/index.js')) || (failure === 'metadata-bytes' && String(url).endsWith('/release.json'))) return new Response('corrupt', { status: 200 });
      return fetchImpl(url);
    };
    await assert.rejects(() => announce(artifactCommit, { fetchImpl: failingFetch }));
    assert.deepEqual(await readFile(latestPath), old, 'failed CDN verification must leave prior announcement byte-for-byte intact');
  });
}

await fixture(async ({ rootDir, stage, commit, announce, latestPath }) => {
  await stage(); const artifactCommit = commit(); await announce(artifactCommit);
  const before = await readFile(latestPath);
  await writeFile(path.join(rootDir, 'unrelated.txt'), 'new artifact commit');
  const anotherCommit = commit();
  await assert.rejects(() => announce(anotherCommit), /版本|提交|改变|覆盖/);
  assert.deepEqual(await readFile(latestPath), before);
});

await fixture(async ({ stage, commit, announce, latestPath }) => {
  await stage(); const artifactCommit = commit();
  const historic = { version: '1.0.0', date: '2026-10-17', changes: ['历史版本'], artifactCommit: '1'.repeat(40), sha256: '2'.repeat(64) };
  await writeFile(latestPath, JSON.stringify({ schemaVersion: 1, latest: historic.version, versions: [historic] }));
  await announce(artifactCommit);
  const latest = JSON.parse(await readFile(latestPath));
  assert.equal(latest.latest, metadata.version);
  assert.deepEqual(latest.versions[0], historic, 'prior version and immutable identity preserved');
  assert.equal(latest.versions.length, 2);
});

await fixture(async ({ stage, commit, announce, latestPath, fetchImpl, rootDir }) => {
  await stage(); const artifactCommit = commit();
  let entered, finish;
  const blocked = new Promise(resolve => entered = resolve);
  const pending = announce(artifactCommit, { fetchImpl: async url => {
    if (String(url).endsWith('/index.js')) { entered(); await new Promise(resolve => finish = resolve); }
    return fetchImpl(url);
  } });
  await blocked;
  await assert.rejects(() => announce(artifactCommit), /另一个|并行|处理/);
  await assert.rejects(readFile(latestPath), { code: 'ENOENT' });
  finish(); await pending;
  assert.equal(JSON.parse(await readFile(latestPath)).versions.length, 1);
  assert(!(await readdir(path.join(rootDir, 'releases/mvu'))).some(name => name.startsWith('.latest')), 'lock and temporary files cleaned');
});

console.log(`PASS: ${passed} local distribution contracts; staging, immutable artifact identity, CDN verification, failure atomicity`);
