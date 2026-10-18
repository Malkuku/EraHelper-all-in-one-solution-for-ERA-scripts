export const REPOSITORY = 'Malkuku/EraHelper-all-in-one-solution-for-ERA-scripts';
export const ANNOUNCEMENT_URL = `https://cdn.jsdelivr.net/gh/${REPOSITORY}@master-erahelper/releases/mvu/latest.json`;
export const SELECTION_KEY = 'mvu_loader_selection';

export interface ReleaseDescriptor {
  version: string;
  date: string;
  changes: string[];
  artifactCommit: string;
  sha256: string;
}

export interface Announcement {
  schemaVersion: 1;
  latest: string;
  versions: ReleaseDescriptor[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('版本资料必须是对象');
  return value as Record<string, unknown>;
}

export function parseReleaseDescriptor(value: unknown): ReleaseDescriptor {
  const data = object(value);
  if (
    typeof data.version !== 'string' ||
    data.version.trim() !== data.version ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(data.version)
  )
    throw new Error('版本号格式错误');
  if (
    typeof data.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    !Number.isFinite(Date.parse(data.date)) ||
    new Date(data.date).toISOString().slice(0, 10) !== data.date
  )
    throw new Error('发布日期格式错误');
  if (
    !Array.isArray(data.changes) ||
    !data.changes.length ||
    data.changes.some(item => typeof item !== 'string' || !item.trim())
  )
    throw new Error('版本说明不能为空');
  if (
    typeof data.artifactCommit !== 'string' ||
    data.artifactCommit.length !== 40 ||
    !/^[a-f0-9]{40}$/.test(data.artifactCommit)
  )
    throw new Error('产物提交号格式错误');
  if (typeof data.sha256 !== 'string' || data.sha256.length !== 64 || !/^[a-f0-9]{64}$/.test(data.sha256))
    throw new Error('产物摘要格式错误');
  return {
    version: data.version,
    date: data.date,
    changes: [...data.changes] as string[],
    artifactCommit: data.artifactCommit,
    sha256: data.sha256,
  };
}

export function parseAnnouncement(value: unknown): Announcement {
  const data = object(value);
  if (data.schemaVersion !== 1 || typeof data.latest !== 'string' || !Array.isArray(data.versions))
    throw new Error('公告格式或协议版本错误');
  const versions = data.versions.map(parseReleaseDescriptor);
  if (new Set(versions.map(item => item.version)).size !== versions.length) throw new Error('公告包含重复版本');
  if (!versions.some(item => item.version === data.latest)) throw new Error('公告中缺少最新版本');
  return { schemaVersion: 1, latest: data.latest, versions };
}

export function coreUrl(release: ReleaseDescriptor): string {
  const valid = parseReleaseDescriptor(release);
  return `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${valid.artifactCommit}/releases/mvu/${valid.version}/index.js`;
}

export async function downloadVerified(
  release: ReleaseDescriptor,
  fetcher: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  const response = await fetcher(coreUrl(release), { cache: 'no-store' });
  if (!response.ok) throw new Error(`下载核心失败：HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== release.sha256) throw new Error('核心 SHA256 摘要不符，已阻止执行');
  return bytes;
}
