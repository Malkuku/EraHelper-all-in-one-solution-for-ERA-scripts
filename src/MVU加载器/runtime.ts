import {
  ANNOUNCEMENT_URL,
  Announcement,
  downloadVerified,
  parseAnnouncement,
  parseReleaseDescriptor,
  ReleaseDescriptor,
} from './protocol';

export interface LoaderHost {
  readSelection(): unknown;
  saveSelection(release: ReleaseDescriptor): void;
  execute(bytes: ArrayBuffer): Promise<unknown>;
  confirm(message: string): boolean;
  reload(): void;
  changed(): void;
  fetcher?: typeof fetch;
}

export class LoaderRuntime {
  selection?: ReleaseDescriptor;
  announcement?: Announcement;
  phase: 'idle' | 'downloading' | 'executing' | 'waiting-ready' | 'ready' | 'failed' = 'idle';
  message = '准备加载';
  working = false;
  private executed = false;
  private canReload?: () => boolean;

  constructor(private host: LoaderHost) {}

  private report(message: string): void {
    this.message = message;
    this.host.changed();
  }

  registerCore(options: { canReload: () => boolean }): void {
    if (!this.executed) throw new Error('核心尚未开始执行，不能注册');
    this.canReload = options.canReload;
    this.phase = 'ready';
    this.report(`正在运行 ${this.selection?.version}`);
  }

  async check(): Promise<void> {
    const response = await (this.host.fetcher ?? fetch)(ANNOUNCEMENT_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`读取版本公告失败：HTTP ${response.status}`);
    const announcement = parseAnnouncement(await response.json());
    // A cached announcement must not silently redefine an already selected release.
    const selected = announcement.versions.find(item => item.version === this.selection?.version);
    if (
      selected &&
      this.selection &&
      (selected.sha256 !== this.selection.sha256 || selected.artifactCommit !== this.selection.artifactCommit)
    )
      throw new Error('公告试图改写已选版本的产物，已拒绝');
    this.announcement = announcement;
    this.report(`本次读取的公告最新版本：${announcement.latest}。未自动切换版本；CDN 公告可能尚未刷新。`);
  }

  async start(): Promise<void> {
    if (this.phase !== 'idle') throw new Error('本会话已经开始加载，请重载后重试');
    this.phase = 'downloading';
    this.report('正在读取选定版本并下载核心');
    try {
      const stored = this.host.readSelection();
      if (stored !== undefined) this.selection = parseReleaseDescriptor(stored);
      else {
        await this.check();
        this.selection = this.announcement!.versions.find(item => item.version === this.announcement!.latest)!;
        this.host.saveSelection(this.selection);
      }
      const bytes = await downloadVerified(this.selection, this.host.fetcher);
      this.executed = true;
      this.phase = 'executing';
      this.report(`正在执行 ${this.selection.version}`);
      await this.host.execute(bytes);
      if (!this.canReload) {
        this.phase = 'waiting-ready';
        this.report('核心模块已执行，等待界面就绪；此时不能切换版本。若始终未就绪，请重载重试。');
      }
    } catch (error) {
      this.phase = 'failed';
      this.report(`加载失败：${error instanceof Error ? error.message : String(error)}。请重载重试。`);
    }
  }

  private assertReloadable(): void {
    if (this.phase === 'downloading' || this.phase === 'executing' || this.phase === 'waiting-ready')
      throw new Error('核心尚未就绪，请等待；若加载停滞，请重载重试');
    if (this.canReload && !this.canReload()) throw new Error('核心有运行中任务，已阻止版本切换，请等待任务结束');
  }

  async apply(version: string): Promise<void> {
    if (this.working) throw new Error('正在处理版本操作，请等待');
    const release = this.announcement?.versions.find(item => item.version === version);
    if (!release) throw new Error('请先检查公告并选择其中的正式版本');
    this.assertReloadable();
    this.working = true;
    this.report(`正在预下载并验证 ${version}`);
    try {
      await downloadVerified(release, this.host.fetcher);
      this.assertReloadable();
      if (
        !this.host.confirm(
          `切换至 ${version} 并重载当前脚本？\n${this.executed && this.phase === 'failed' ? '核心执行失败可能已有部分副作用；将通过重载清理本会话后加载选定版本。\n' : ''}请先保存全部配置、变量与密钥草稿。运行日志与回滚 Journal 不会跨会话恢复。`,
        )
      ) {
        this.report('已取消切换，当前版本保持不变');
        return;
      }
      this.assertReloadable();
      this.host.saveSelection(release);
      this.selection = release;
      this.host.reload();
    } finally {
      this.working = false;
      this.host.changed();
    }
  }

  reload(): void {
    if (this.canReload && !this.canReload()) throw new Error('核心有运行中任务，已阻止重载，请等待任务结束');
    if (this.phase === 'ready') this.assertReloadable();
    if (
      this.host.confirm('重载当前脚本并重试？请先保存全部配置、变量与密钥草稿。运行日志与回滚 Journal 不会跨会话恢复。')
    ) {
      if (this.canReload && !this.canReload()) throw new Error('核心有运行中任务，已阻止重载，请等待任务结束');
      this.host.reload();
    }
  }
}
