import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_REPOSITORY, validateReleaseMetadata } from './prepare.mjs';

const defaultRoot = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^[0-9a-f]{64}$/;
const safeName = /^[\w.-]+$/;

async function regularFile(filename) {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`必须为普通文件：${filename}`);
  return readFile(filename);
}

// Walk every ancestor rather than trusting recursive mkdir through a symlink.
async function workspaceDirectory(root, directory, create = false) {
  const target = path.resolve(directory);
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`目录越出工作区：${directory}`);
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (create)
      await mkdir(current).catch(error => {
        if (error.code !== 'EEXIST') throw error;
      });
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(current)) !== current) {
      throw new Error(`目录不能为符号链接：${current}`);
    }
  }
  return target;
}

function validateCandidate(files) {
  const required = ['index.js', 'release.json', 'release-notes.md', 'SHA256SUMS'];
  for (const name of required)
    if (!files.has(name) || !files.get(name).toString('utf8').trim()) {
      throw new Error(`候选包缺少非空文件：${name}`);
    }
  const manifest = JSON.parse(files.get('release.json').toString('utf8'));
  const metadata = validateReleaseMetadata(manifest);
  if (
    manifest.status !== 'candidate' ||
    manifest.repository !== RELEASE_REPOSITORY ||
    typeof manifest.sourceSha !== 'string' ||
    manifest.sourceSha.length !== 40 ||
    !commitPattern.test(manifest.sourceSha) ||
    manifest.sourceDirty !== false
  ) {
    throw new Error('仅接受来源明确且 sourceDirty=false 的候选包');
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new Error('候选 files 必须为文件摘要对象');
  }
  const expectedPayload = ['index.js'];
  const lines = files.get('index.js').toString('utf8').split(/\r?\n/).reverse();
  const references = [];
  for (const line of lines) {
    if (line.trim() && !line.trimStart().startsWith('//')) break;
    const match = line.match(/^[ \t]*\/\/[#@][ \t]*sourceMappingURL[ \t]*=[ \t]*(.*?)[ \t]*$/);
    if (match) references.push(match[1]);
  }
  if (references.length > 1) throw new Error('核心包含多个 sourcemap 引用');
  if (references.length) {
    const name = references[0];
    if (!/^[\w.-]+\.map$/.test(name) || name.startsWith('..')) throw new Error('sourcemap 路径不安全');
    expectedPayload.push(name);
  }
  if (Object.keys(manifest.files).sort().join('\n') !== expectedPayload.sort().join('\n')) {
    throw new Error('候选 files 与核心实际引用不一致');
  }
  for (const name of expectedPayload) {
    if (
      !files.has(name) ||
      !files.get(name).toString('utf8').trim() ||
      !digestPattern.test(manifest.files[name]) ||
      sha256(files.get(name)) !== manifest.files[name]
    ) {
      throw new Error(`候选文件摘要不符：${name}`);
    }
  }
  const sums = new Map();
  for (const line of files.get('SHA256SUMS').toString('utf8').trimEnd().split(/\r?\n/)) {
    const match = /^([0-9a-f]{64}) {2}([\w.-]+)$/.exec(line);
    if (!match || sums.has(match[2]) || match[2] === 'SHA256SUMS') throw new Error('SHA256SUMS 格式或文件名无效');
    sums.set(match[2], match[1]);
  }
  const names = [...expectedPayload, 'release.json', 'release-notes.md'].sort();
  if (
    [...sums.keys()].sort().join('\n') !== names.join('\n') ||
    [...files.keys()].sort().join('\n') !== [...names, 'SHA256SUMS'].sort().join('\n')
  ) {
    throw new Error('候选包文件清单与摘要清单不一致');
  }
  for (const [name, digest] of sums)
    if (sha256(files.get(name)) !== digest) {
      throw new Error(`SHA256SUMS 摘要不符：${name}`);
    }
  const notes = files.get('release-notes.md').toString('utf8');
  for (const content of [metadata.version, metadata.date, manifest.sourceSha, ...metadata.changes]) {
    if (!notes.includes(content)) throw new Error('候选更新说明与元数据不一致');
  }
  return manifest;
}

export async function stageRelease({ rootDir = defaultRoot, candidateDir = 'dist/mvu-release' } = {}) {
  const root = await realpath(rootDir);
  const candidate = await workspaceDirectory(root, path.resolve(root, candidateDir));
  const files = new Map();
  for (const name of await readdir(candidate)) {
    if (!safeName.test(name) || name.startsWith('..')) throw new Error('候选文件名不安全');
    files.set(name, await regularFile(path.join(candidate, name)));
  }
  const manifest = validateCandidate(files);
  const releases = await workspaceDirectory(root, path.join(root, 'releases/mvu'), true);
  const output = path.join(releases, manifest.version);
  // No recursive mkdir: EEXIST protects all existing versions, including symlinks.
  await mkdir(output);
  try {
    for (const [name, bytes] of files) await writeFile(path.join(output, name), bytes, { flag: 'wx' });
  } catch (error) {
    await workspaceDirectory(root, output);
    await rm(output, { recursive: true });
    throw error;
  }
  return { version: manifest.version, output, sourceSha: manifest.sourceSha };
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function committedCandidate(root, artifactCommit, version) {
  if (typeof artifactCommit !== 'string' || artifactCommit.length !== 40 || !commitPattern.test(artifactCommit)) {
    throw new Error('artifactCommit 必须为完整40位小写提交号');
  }
  if (
    git(root, ['rev-parse', '--verify', `${artifactCommit}^{commit}`])
      .toString('utf8')
      .trim() !== artifactCommit
  ) {
    throw new Error('artifactCommit 必须直接指向 Git 提交');
  }
  const prefix = `releases/mvu/${version}/`;
  const entries = git(root, ['ls-tree', '-rz', artifactCommit, '--', prefix])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const files = new Map();
  for (const entry of entries) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(entry);
    if (!match || !match[3].startsWith(prefix)) throw new Error('产物提交包含非普通文件');
    const name = match[3].slice(prefix.length);
    if (!safeName.test(name) || name.startsWith('..')) throw new Error('产物提交包含不安全文件名');
    files.set(name, git(root, ['cat-file', 'blob', match[2]]));
  }
  const manifest = validateCandidate(files);
  if (manifest.version !== version) throw new Error('产物目录与候选版本不符');
  return { files, manifest };
}

function validateAnnouncement(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.versions) || !value.versions.length) {
    throw new Error('现有公告格式无效');
  }
  const versions = new Set();
  const entries = value.versions.map(entry => {
    const metadata = validateReleaseMetadata(entry);
    if (
      typeof entry.artifactCommit !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      entry.artifactCommit.length !== 40 ||
      entry.sha256.length !== 64 ||
      !commitPattern.test(entry.artifactCommit) ||
      !digestPattern.test(entry.sha256) ||
      versions.has(entry.version)
    ) {
      throw new Error('现有公告版本重复或提交/摘要无效');
    }
    versions.add(entry.version);
    return { ...metadata, artifactCommit: entry.artifactCommit, sha256: entry.sha256 };
  });
  if (!versions.has(value.latest)) throw new Error('现有公告 latest 不在版本清单中');
  return { schemaVersion: 1, latest: value.latest, versions: entries };
}

export async function announceRelease({
  rootDir = defaultRoot,
  version,
  artifactCommit,
  fetchImpl = globalThis.fetch,
} = {}) {
  // Validate path input before allowing it into any filesystem/Git operation.
  validateReleaseMetadata({ version, date: '2000-01-01', changes: ['validate version'] });
  const root = await realpath(rootDir);
  const { files, manifest } = committedCandidate(root, artifactCommit, version);
  const directory = await workspaceDirectory(root, path.join(root, 'releases/mvu'), true);
  const latestPath = path.join(directory, 'latest.json');
  const lockPath = path.join(directory, '.latest.lock');
  const lock = await open(lockPath, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error('公告正由另一个进程处理；请稍后重试，勿并行发布');
    throw error;
  });
  const temporary = path.join(directory, `.latest-${randomUUID()}.tmp`);
  try {
    let previous = { schemaVersion: 1, latest: version, versions: [] };
    try {
      previous = validateAnnouncement(JSON.parse(await regularFile(latestPath)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const entry = { ...validateReleaseMetadata(manifest), artifactCommit, sha256: manifest.files['index.js'] };
    const existing = previous.versions.find(item => item.version === version);
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
      throw new Error('已公告版本不可改指其他提交、内容或元数据');
    }
    const base = `https://cdn.jsdelivr.net/gh/${RELEASE_REPOSITORY}@${artifactCommit}/releases/mvu/${version}`;
    for (const name of ['index.js', 'release.json']) {
      const response = await fetchImpl(`${base}/${name}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`CDN ${name} HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.equals(files.get(name))) throw new Error(`CDN ${name} 与产物提交字节不符`);
    }
    const announcement = {
      schemaVersion: 1,
      latest: version,
      versions: existing ? previous.versions : [...previous.versions, entry],
    };
    await writeFile(temporary, `${JSON.stringify(announcement, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, latestPath);
    return announcement;
  } finally {
    await rm(temporary, { force: true });
    await lock.close();
    await rm(lockPath);
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  const allowed = command === 'stage' ? ['--candidate'] : ['--version', '--commit'];
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || args[i] in options) {
      throw new Error('参数无效：stage [--candidate 目录] 或 announce --version 版本 --commit 完整提交号');
    }
    options[args[i]] = args[i + 1];
  }
  if (command === 'stage') {
    const result = await stageRelease({ candidateDir: options['--candidate'] });
    console.log(`已准备 ${result.version} 版本目录：${result.output}；尚未更新公告，请审阅并提交推送产物。`);
  } else if (command === 'announce') {
    const result = await announceRelease({ version: options['--version'], artifactCommit: options['--commit'] });
    console.log(`已核对 CDN 并生成本地 ${result.latest} 公告；请审阅后自行提交发布。`);
  } else throw new Error('必须指定 stage 或 announce');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`发布准备失败：${error.message}`);
    process.exitCode = 1;
  });
}
