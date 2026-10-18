import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_REPOSITORY = 'Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts';
const defaultRoot = fileURLToPath(new URL('../../', import.meta.url));

export function validateReleaseMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('release.json 必须为对象');
  const { version, date, changes } = value;
  if (
    typeof version !== 'string' ||
    version !== version.trim() ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
  ) {
    throw new Error('version 必须为不含 v 的三段正式版本');
  }
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error('date 必须为有效的 YYYY-MM-DD 日期');
  if (!Array.isArray(changes) || !changes.length || changes.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error('changes 必须为非空说明数组，每项必须为非空字符串');
  }
  return { version, date, changes: [...changes] };
}

function validateSource(repository, sourceSha, sourceDirty) {
  if (repository !== RELEASE_REPOSITORY) throw new Error(`repository 必须为 ${RELEASE_REPOSITORY}`);
  if (typeof sourceSha !== 'string' || sourceSha.length !== 40 || !/^[0-9a-f]{40}$/.test(sourceSha)) {
    throw new Error('sourceSha 必须为完整的 40 位 Git 提交标识');
  }
  if (typeof sourceDirty !== 'boolean') throw new Error('sourceDirty 必须明确为布尔值');
}

// These fixed paths are also checked physically before any recursive deletion.
async function outputPaths(rootDir) {
  const root = await realpath(rootDir);
  const dist = path.join(root, 'dist');
  await mkdir(dist, { recursive: true });
  if ((await lstat(dist)).isSymbolicLink() || (await realpath(dist)) !== dist) {
    throw new Error('dist 必须为工作区内的真实目录');
  }
  return { root, output: path.join(dist, 'mvu-release') };
}

async function clearOutput(output) {
  try {
    const stat = await lstat(output);
    if (stat.isSymbolicLink() || (await realpath(output)) !== output) throw new Error('候选包目录不能为符号链接');
    await rm(output, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function readWorkspaceFile(root, filename) {
  const resolved = await realpath(filename);
  const relative = path.relative(root, resolved);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`文件越出工作区：${filename}`);
  }
  return readFile(resolved);
}

async function readMetadata(root) {
  return validateReleaseMetadata(
    JSON.parse(await readWorkspaceFile(root, path.join(root, 'src/MVU助手/release.json'))),
  );
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function packageRelease({
  rootDir = defaultRoot,
  repository = RELEASE_REPOSITORY,
  sourceSha,
  sourceDirty,
} = {}) {
  const { root, output } = await outputPaths(rootDir);
  await clearOutput(output);
  try {
    const metadata = await readMetadata(root);
    validateSource(repository, sourceSha, sourceDirty);
    const bundleDir = path.join(root, 'dist/MVU助手');
    const script = await readWorkspaceFile(root, path.join(bundleDir, 'index.js'));
    if (!script.toString('utf8').trim()) throw new Error('index.js 不能为空');
    const payload = { 'index.js': script };
    // Webpack places its JS directive in the trailing line comments. Runtime code
    // also contains CSS sourcemap strings; those are not references for this file.
    const trailingComments = [];
    for (const line of script.toString('utf8').split(/\r?\n/).reverse()) {
      if (line.trim() && !line.trimStart().startsWith('//')) break;
      trailingComments.push(line);
    }
    const references = trailingComments
      .map(line => line.match(/^[ \t]*\/\/[#@][ \t]*sourceMappingURL[ \t]*=[ \t]*(.*?)[ \t]*$/))
      .filter(Boolean);
    if (references.length > 1) throw new Error('index.js 包含多个 sourcemap 引用');
    if (references.length) {
      const filename = references[0][1];
      if (!/^[\w.-]+\.map$/.test(filename) || filename.startsWith('..')) {
        throw new Error('sourcemap 必须使用同目录的安全相对文件名');
      }
      const map = await readWorkspaceFile(root, path.join(bundleDir, filename));
      if (!map.toString('utf8').trim()) throw new Error('引用的 sourcemap 不能为空');
      payload[filename] = map;
    }
    const manifest = {
      ...metadata,
      status: 'candidate',
      repository,
      sourceSha,
      sourceDirty,
      files: Object.fromEntries(Object.entries(payload).map(([name, bytes]) => [name, sha256(bytes)])),
    };
    payload['release.json'] = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    payload['release-notes.md'] = Buffer.from(
      `# MVU助手 ${metadata.version}\n\n日期：${metadata.date}\n\n` +
        metadata.changes.map(change => `- ${change}`).join('\n') +
        `\n\n来源仓库：${repository}\n\n源码提交：${sourceSha}\n\n` +
        (sourceDirty ? '注意：源码包含未提交更改，提交标识仅代表基线，不能完整还原此候选包。\n\n' : '') +
        '此文件包为待验证候选包，不代表已经正式发布。脚本依赖酒馆及现有远程运行依赖。\n\n' +
        '手动安装：在原酒馆脚本内替换完整 index.js 内容，保留原脚本 ID；更新前保存草稿并结束当前任务。\n',
    );
    payload.SHA256SUMS = Buffer.from(
      Object.entries(payload)
        .map(([name, bytes]) => `${sha256(bytes)}  ${name}\n`)
        .join(''),
    );
    await mkdir(output);
    for (const [filename, bytes] of Object.entries(payload)) await writeFile(path.join(output, filename), bytes);
    return manifest;
  } catch (error) {
    await clearOutput(output);
    throw error;
  }
}

export async function prepareRelease({
  rootDir = defaultRoot,
  repository = RELEASE_REPOSITORY,
  sourceSha,
  sourceDirty,
  build,
} = {}) {
  const { root, output } = await outputPaths(rootDir);
  await clearOutput(output);
  try {
    await readMetadata(root);
    if (sourceSha === undefined) {
      sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    }
    if (sourceDirty === undefined) {
      sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
    }
    validateSource(repository, sourceSha, sourceDirty);
    if (build) {
      await build();
    } else {
      const options = { cwd: root, stdio: 'inherit' };
      // A fixed command avoids passing shell arguments through Node's deprecated
      // shell:true + args path on Windows. No user input enters the shell text.
      const result =
        process.platform === 'win32'
          ? spawnSync('pnpm build', { ...options, shell: true })
          : spawnSync('pnpm', ['build'], options);
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`生产构建失败（退出码 ${result.status}）`);
    }
    return await packageRelease({ rootDir: root, repository, sourceSha, sourceDirty });
  } catch (error) {
    await clearOutput(output);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareRelease().then(
    manifest => console.log(`已准备 MVU助手 ${manifest.version} 候选包：dist/mvu-release（${manifest.sourceSha}）`),
    error => {
      console.error(`发布准备失败：${error.message}`);
      process.exitCode = 1;
    },
  );
}
