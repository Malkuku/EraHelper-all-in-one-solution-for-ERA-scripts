// Primary deterministic contract for offline MVU release preparation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { packageRelease, prepareRelease, RELEASE_REPOSITORY } from '../../scripts/release/prepare.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceSha = '1234567890abcdef1234567890abcdef12345678';
const metadata = { version: '2.0.0', date: '2026-10-17', changes: ['保留中文更新说明。', '草稿与配置兼容说明。'] };
const script = 'console.log("fixture");\n//# sourceMappingURL=index.js.map\n';
const sourceMap = JSON.stringify({ version: 3, file: 'index.js', sources: ['fixture.ts'], names: [], mappings: '' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let assertions = 0;

async function fixture(run) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mvu-release-contract-'));
  const sourceDir = path.join(rootDir, 'src/MVU助手');
  const bundleDir = path.join(rootDir, 'dist/MVU助手');
  const outputDir = path.join(rootDir, 'dist/mvu-release');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(bundleDir, { recursive: true });
  await writeFile(path.join(sourceDir, 'release.json'), JSON.stringify(metadata));
  await writeFile(path.join(bundleDir, 'index.js'), script);
  await writeFile(path.join(bundleDir, 'index.js.map'), sourceMap);
  const options = { rootDir, repository: RELEASE_REPOSITORY, sourceSha, sourceDirty: false };
  try {
    await run({ rootDir, sourceDir, bundleDir, outputDir, options });
    assertions++;
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

await fixture(async ({ bundleDir, outputDir, options }) => {
  const returned = await packageRelease(options);
  const manifest = JSON.parse(await readFile(path.join(outputDir, 'release.json'), 'utf8'));
  assert.deepEqual(returned, manifest);
  assert.equal(manifest.version, metadata.version);
  assert.equal(manifest.date, metadata.date);
  assert.deepEqual(manifest.changes, metadata.changes);
  assert.equal(manifest.repository, RELEASE_REPOSITORY);
  assert.equal(manifest.sourceSha, sourceSha);
  assert.equal(manifest.sourceDirty, false);
  assert.equal(manifest.status, 'candidate');
  assert.deepEqual(
    (await readdir(outputDir)).sort(),
    ['SHA256SUMS', 'index.js', 'index.js.map', 'release-notes.md', 'release.json'].sort(),
  );
  for (const file of ['index.js', 'index.js.map']) {
    const bytes = await readFile(path.join(outputDir, file));
    assert.deepEqual(bytes, await readFile(path.join(bundleDir, file)), `${file} copied without rewriting`);
    assert.equal(manifest.files[file], hash(bytes));
  }
  const sums = (await readFile(path.join(outputDir, 'SHA256SUMS'), 'utf8')).trim().split(/\r?\n/);
  const entries = sums.map(line => {
    const matched = /^([a-f0-9]{64})\s+\*?(.+)$/.exec(line);
    assert(matched, `standard checksum line: ${line}`);
    return [matched[2], matched[1]];
  });
  assert.deepEqual(
    entries.map(([name]) => name).sort(),
    ['index.js', 'index.js.map', 'release-notes.md', 'release.json'].sort(),
  );
  for (const [name, digest] of entries) assert.equal(hash(await readFile(path.join(outputDir, name))), digest);
  const notes = await readFile(path.join(outputDir, 'release-notes.md'), 'utf8');
  for (const content of [metadata.version, metadata.date, sourceSha, ...metadata.changes])
    assert(notes.includes(content), `notes retain ${content}`);
  assert(!notes.includes('cdn.jsdelivr.net'), 'candidate does not announce unavailable CDN artifacts');
});

// A script without a sourceMappingURL has no required map dependency.
await fixture(async ({ bundleDir, outputDir, options }) => {
  await writeFile(path.join(bundleDir, 'index.js'), 'console.log("no map");');
  await rm(path.join(bundleDir, 'index.js.map'));
  await packageRelease(options);
  assert(!(await readdir(outputDir)).includes('index.js.map'));
});

// Real webpack CSS runtime embeds source-map comments as strings. Only the
// actual JS directive references a dependency of this release artifact.
const webpackRuntime = [
  "var a='sourceMappingURL=data:application/json;charset=utf-8;base64,'.concat('AAAA');",
  "var css='\\n/*# sourceMappingURL=data:application/json;base64,'+btoa('fixture')+' */';",
  'var quoted="//# sourceMappingURL=not-a-file.map";',
].join('\n');
await fixture(async ({ bundleDir, outputDir, options }) => {
  const webpackScript = `${webpackRuntime}\n//# sourceMappingURL=index.js.map\n`;
  await writeFile(path.join(bundleDir, 'index.js'), webpackScript);
  const result = await packageRelease(options);
  assert.equal(await readFile(path.join(outputDir, 'index.js'), 'utf8'), webpackScript);
  assert.equal(await readFile(path.join(outputDir, 'index.js.map'), 'utf8'), sourceMap);
  assert.equal(result.files['index.js.map'], hash(sourceMap));
});
await fixture(async ({ bundleDir, outputDir, options }) => {
  await writeFile(path.join(bundleDir, 'index.js'), webpackRuntime);
  await rm(path.join(bundleDir, 'index.js.map'));
  const result = await packageRelease(options);
  assert.equal(result.files['index.js.map'], undefined);
  assert(!(await readdir(outputDir)).includes('index.js.map'));
});

await fixture(async ({ outputDir, options }) => {
  await packageRelease({ ...options, sourceDirty: true });
  const manifest = JSON.parse(await readFile(path.join(outputDir, 'release.json'), 'utf8'));
  assert.equal(manifest.sourceDirty, true);
  assert.equal(manifest.status, 'candidate');
  assert.match(await readFile(path.join(outputDir, 'release-notes.md'), 'utf8'), /未提交|dirty/i);
});

async function rejected(mutate) {
  await fixture(async context => {
    await packageRelease(context.options); // Prior success must not masquerade as the failed attempt.
    await mutate(context);
    await assert.rejects(() => packageRelease(context.options));
    const files = await readdir(context.outputDir).catch(error => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    assert(!files.includes('release.json') && !files.includes('SHA256SUMS'), 'failure clears success markers');
  });
}

for (const version of ['', 'v2.0.0', '2.0', '02.0.0', '2.0.0-beta.1', '../2.0.0', '2.0.0\n']) {
  await rejected(({ sourceDir }) =>
    writeFile(path.join(sourceDir, 'release.json'), JSON.stringify({ ...metadata, version })),
  );
}
for (const date of ['', '2026-2-01', '2026-02-29', '2026-04-31', '2026-13-01']) {
  await rejected(({ sourceDir }) =>
    writeFile(path.join(sourceDir, 'release.json'), JSON.stringify({ ...metadata, date })),
  );
}
for (const changes of [[], [''], ['  '], ['valid', 123], 'not-array']) {
  await rejected(({ sourceDir }) =>
    writeFile(path.join(sourceDir, 'release.json'), JSON.stringify({ ...metadata, changes })),
  );
}
await rejected(({ sourceDir }) => writeFile(path.join(sourceDir, 'release.json'), '{broken json'));
await rejected(({ sourceDir }) => rm(path.join(sourceDir, 'release.json')));
for (const sourceShaValue of ['', '1234567', 'g'.repeat(40), 'a'.repeat(40) + '\n']) {
  await rejected(({ options }) => {
    options.sourceSha = sourceShaValue;
  });
}
await rejected(({ options }) => {
  options.repository = 'https://github.com/other/project';
});
for (const sourceDirty of [undefined, 'false', 0]) {
  await rejected(({ options }) => {
    options.sourceDirty = sourceDirty;
  });
}
await rejected(({ bundleDir }) => rm(path.join(bundleDir, 'index.js')));
await rejected(({ bundleDir }) => writeFile(path.join(bundleDir, 'index.js'), ' \n '));
await rejected(({ bundleDir }) => rm(path.join(bundleDir, 'index.js.map')));
await rejected(({ bundleDir }) => writeFile(path.join(bundleDir, 'index.js.map'), ''));
await rejected(({ bundleDir }) =>
  writeFile(path.join(bundleDir, 'index.js'), `${script}//# sourceMappingURL=another.js.map\n`),
);
for (const map of ['../outside.map', '/tmp/outside.map', 'https://example.com/source.map']) {
  await rejected(({ bundleDir }) =>
    writeFile(path.join(bundleDir, 'index.js'), `console.log(1);\n//# sourceMappingURL=${map}`),
  );
}

await fixture(async ({ sourceDir, outputDir, options }) => {
  await packageRelease(options);
  await writeFile(path.join(sourceDir, 'release.json'), JSON.stringify({ ...metadata, version: 'bad' }));
  let built = false;
  await assert.rejects(() =>
    prepareRelease({
      ...options,
      build: async () => {
        built = true;
      },
    }),
  );
  assert.equal(built, false, 'invalid release is rejected before build');
  await assert.rejects(() => readFile(path.join(outputDir, 'release.json')), { code: 'ENOENT' });
});

await fixture(async ({ outputDir, options }) => {
  await packageRelease(options);
  await assert.rejects(
    () =>
      prepareRelease({
        ...options,
        build: async () => {
          throw new Error('fixture build failed');
        },
      }),
    /fixture build failed/,
  );
  await assert.rejects(() => readFile(path.join(outputDir, 'release.json')), { code: 'ENOENT' });
});

await fixture(async ({ bundleDir, outputDir, options }) => {
  let builds = 0;
  await prepareRelease({
    ...options,
    build: async () => {
      builds++;
      await writeFile(path.join(bundleDir, 'index.js'), 'console.log("fresh build");');
    },
  });
  assert.equal(builds, 1);
  assert.equal(await readFile(path.join(outputDir, 'index.js'), 'utf8'), 'console.log("fresh build");');
});

// Workflow policy is part of the release contract: a candidate never publishes itself.
const workflowPath = path.join(repositoryRoot, '.github/workflows/prepare-mvu-release.yaml');
const workflowText = await readFile(workflowPath, 'utf8');
const workflow = parse(workflowText);
assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
const sourceRef = workflow.on.workflow_dispatch.inputs.source_ref;
assert.equal(sourceRef.type, 'string');
assert.equal(sourceRef.required, true);
assert.equal(sourceRef.default, 'feature-erahelper-mvu');
assert.equal(workflow.permissions.contents, 'read');
const steps = Object.values(workflow.jobs).flatMap(job => job.steps);
const checkout = steps.find(step => step.uses?.startsWith('actions/checkout@'));
assert.equal(
  checkout.with.ref,
  '${{ inputs.source_ref }}',
  'checkout uses the requested source rather than workflow ref',
);
const packageScripts = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8')).scripts;
const commands = steps
  .map(step => step.run ?? '')
  .join('\n')
  .replace(/pnpm ([\w:-]+)/g, (command, name) => packageScripts[name] ?? command);
assert(steps.some(step => String(step.with?.['node-version']) === '24'));
assert(steps.some(step => String(step.with?.version) === '11' && step.uses?.startsWith('pnpm/action-setup@')));
assert(steps.some(step => step.run?.includes('pnpm install --frozen-lockfile')));
for (const suite of [
  'tests/async-tasks/generation.cjs',
  'tests/async-tasks/commit.cjs',
  'tests/async-tasks/runtime.cjs',
  'tests/async-tasks/configuration.cjs',
  'tests/mvu-editing.cjs',
  'tests/release/prepare.mjs',
  'tests/release/distribute.mjs',
]) {
  assert(commands.includes(suite), `CI executes ${suite}`);
}
assert(steps.some(step => step.run?.includes('pnpm release:prepare')));
assert(
  steps.some(
    step => step.uses?.startsWith('actions/upload-artifact@') && JSON.stringify(step.with).includes('dist/mvu-release'),
  ),
);
const candidate = steps.find(step => step.id === 'candidate');
const artifact = steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
assert(artifact.with.name.includes('${{ steps.candidate.outputs.source_sha }}'));
assert(artifact.with.name.includes('${{ steps.candidate.outputs.version }}'));
assert(!artifact.with.name.includes('github.sha'), 'workflow identity must not label a different checkout');
const loaderArtifact = steps.find(step => step.uses?.startsWith('actions/upload-artifact@') && step.with?.path === 'dist/MVU加载器/');
assert(loaderArtifact, 'candidate workflow delivers the installed loader alongside the core candidate');
assert.equal(loaderArtifact.with.name, 'mvu-loader-${{ steps.candidate.outputs.source_sha }}');
assert.equal(loaderArtifact.with['if-no-files-found'], 'error');

// Run the actual identity extraction against a fixture manifest. The workflow's
// own SHA deliberately differs from the checked-out source recorded in the package.
await fixture(async ({ rootDir, options }) => {
  await packageRelease(options);
  const prefix = 'node --input-type=module -e "';
  assert(candidate.run.startsWith(prefix) && candidate.run.endsWith('"'));
  const script = candidate.run.slice(prefix.length, -1);
  const outputPath = path.join(rootDir, 'github-output');
  execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: rootDir,
    env: { ...process.env, GITHUB_OUTPUT: outputPath, GITHUB_SHA: 'f'.repeat(40) },
  });
  const outputs = Object.fromEntries(
    (await readFile(outputPath, 'utf8'))
      .trim()
      .split(/\r?\n/)
      .map(line => line.split('=')),
  );
  assert.equal(outputs.source_sha, sourceSha, 'artifact source identity comes from candidate metadata');
  assert.equal(outputs.version, metadata.version);
});
assert(!/contents:\s*write|gh release|git push|autotag|softprops\/action-gh-release/.test(workflowText));
for (const name of await readdir(path.join(repositoryRoot, '.github/workflows'))) {
  const text = await readFile(path.join(repositoryRoot, '.github/workflows', name), 'utf8');
  assert(!/autotag-action|git push --delete.*tag|git tag\s/.test(text), `${name} does not automatically mutate tags`);
}
console.log(
  `PASS: ${assertions} offline release success/failure contracts; provenance, notes, maps, checksums, stale-output removal and manual-only CI policy`,
);
