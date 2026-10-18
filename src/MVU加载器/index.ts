import { ANNOUNCEMENT_URL, parseReleaseDescriptor, SELECTION_KEY } from './protocol';
import { LoaderRuntime } from './runtime';

// This entry intentionally uses only browser and Tavern Helper APIs.
$(() => {
  const hostDocument = window.parent.document;
  const variableOption = { type: 'script' as const, script_id: getScriptId() };
  let panel: HTMLDivElement | undefined;
  let status: HTMLParagraphElement | undefined;
  let current: HTMLParagraphElement | undefined;
  let versions: HTMLSelectElement | undefined;
  let notes: HTMLPreElement | undefined;
  let previousFocus: HTMLElement | null = null;
  let actionRunning = false;
  const controls: HTMLButtonElement[] = [];

  const runtime = new LoaderRuntime({
    readSelection: () => getVariables(variableOption)[SELECTION_KEY],
    saveSelection: release => {
      updateVariablesWith(variables => ({ ...variables, [SELECTION_KEY]: release }), variableOption);
      const stored = parseReleaseDescriptor(getVariables(variableOption)[SELECTION_KEY]);
      if (JSON.stringify(stored) !== JSON.stringify(release)) throw new Error('选定版本保存失败，未重载');
    },
    execute: async bytes => {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
      try {
        await import(/* webpackIgnore: true */ url);
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    confirm: message => window.parent.confirm(message),
    reload: () => window.location.reload(),
    changed: render,
  });

  function renderNotes(): void {
    if (!versions || !notes) return;
    const release = runtime.announcement?.versions.find(item => item.version === versions!.value);
    notes.textContent = release
      ? `${release.version} · ${release.date}\n\n${release.changes.map(item => `• ${item}`).join('\n')}`
      : '检查公告后可查看各版本说明。';
  }

  function render(): void {
    if (!panel || !status || !current || !versions) return;
    const phaseLabels = { idle: '准备中', downloading: '下载中', executing: '启动中', 'waiting-ready': '等待助手就绪', ready: '运行中', failed: '加载失败' };
    current.textContent = `安装方式：CDN 加载器 | 选定版本：${runtime.selection?.version ?? '尚未选定'} | 状态：${phaseLabels[runtime.phase]}`;
    status.textContent = runtime.message;
    const old = versions.value;
    versions.replaceChildren();
    for (const release of runtime.announcement?.versions ?? []) {
      const option = hostDocument.createElement('option');
      option.value = release.version;
      option.textContent = `${release.version}${release.version === runtime.announcement!.latest ? '（公告最新版）' : ''}${release.version === runtime.selection?.version ? '（当前选定）' : ''}`;
      versions.append(option);
    }
    const preferred = old || runtime.selection?.version || runtime.announcement?.latest;
    if (preferred && Array.from(versions.options).some(option => option.value === preferred))
      versions.value = preferred;
    controls.forEach(button => {
      button.disabled = actionRunning || runtime.working;
    });
    versions.disabled = actionRunning || runtime.working;
    renderNotes();
  }

  async function action(work: () => void | Promise<void>): Promise<void> {
    if (actionRunning) return;
    actionRunning = true;
    render();
    try {
      await work();
    } catch (error) {
      runtime.message = error instanceof Error ? error.message : String(error);
      console.error('[MVU加载器]', error);
    } finally {
      actionRunning = false;
      render();
    }
  }

  function close(): void {
    if (panel) panel.hidden = true;
    previousFocus?.focus();
  }

  function open(): void {
    previousFocus = hostDocument.activeElement as HTMLElement | null;
    if (!panel) createPanel();
    panel!.hidden = false;
    render();
    panel!.querySelector('button')?.focus();
  }

  function createPanel(): void {
    panel = hostDocument.createElement('div');
    panel.setAttribute('data-mvu-loader', getScriptId());
    panel.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;color:#eee;font:14px/1.6 system-ui,sans-serif;';
    const style = hostDocument.createElement('style');
    style.textContent =
      '[data-mvu-loader][hidden]{display:none!important}[data-mvu-loader] button,[data-mvu-loader] select{font:inherit;border:1px solid #777;border-radius:6px;padding:7px 10px;color:#eee;background:#343941;max-width:100%;cursor:pointer}[data-mvu-loader] button:disabled{opacity:.5;cursor:wait}[data-mvu-loader] button:focus-visible,[data-mvu-loader] select:focus-visible{outline:2px solid #9acfff;outline-offset:2px}';
    panel.append(style);
    const dialog = hostDocument.createElement('section');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'MVU 版本管理');
    dialog.style.cssText =
      'background:#20242b;border:1px solid #777;border-radius:12px;padding:20px;width:620px;max-width:100%;max-height:90dvh;overflow:auto;box-sizing:border-box;box-shadow:0 12px 48px #0008';
    panel.append(dialog);
    const heading = hostDocument.createElement('h2');
    heading.textContent = 'MVU 版本管理';
    heading.style.cssText = 'font:600 20px system-ui;margin:0 0 12px';
    dialog.append(heading);
    const makeButton = (
      label: string,
      handler: () => void,
      container: HTMLElement,
      controlled = true,
    ): HTMLButtonElement => {
      const button = hostDocument.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', handler);
      container.append(button);
      if (controlled) controls.push(button);
      return button;
    };
    makeButton('关闭', close, dialog, false);
    current = hostDocument.createElement('p');
    status = hostDocument.createElement('p');
    status.setAttribute('role', 'status');
    status.style.cssText =
      'white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid #9acfff;padding-left:10px';
    dialog.append(current, status);
    const toolbar = hostDocument.createElement('div');
    toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
    dialog.append(toolbar);
    makeButton(
      '检查更新',
      () => {
        void action(() => runtime.check());
      },
      toolbar,
    );
    makeButton(
      '刷新公告 CDN',
      () => {
        // The official purge form requires reCAPTCHA. Never invent a successful purge response.
        window.parent.open('https://www.jsdelivr.com/tools/purge', '_blank', 'noopener,noreferrer');
        void action(async () => {
          const guidance = `官方刷新需在新页面完成验证码，并粘贴下方公告地址。此处尚未清除缓存；完成后请再次检查更新。\n${ANNOUNCEMENT_URL}\n`;
          try {
            await runtime.check();
            runtime.message = guidance + runtime.message;
          } catch (error) {
            runtime.message = guidance + (error instanceof Error ? error.message : String(error));
          }
        });
      },
      toolbar,
    );
    makeButton(
      '重载重试',
      () => {
        void action(() => runtime.reload());
      },
      toolbar,
    );
    const label = hostDocument.createElement('label');
    label.textContent = '选择正式版本 ';
    versions = hostDocument.createElement('select');
    versions.setAttribute('aria-label', '选择正式版本');
    versions.addEventListener('change', renderNotes);
    label.append(versions);
    dialog.append(label);
    notes = hostDocument.createElement('pre');
    notes.style.cssText =
      'font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;background:#15181d;border:1px solid #555;padding:12px;border-radius:6px;max-height:220px;overflow:auto';
    dialog.append(notes);
    makeButton(
      '应用选定版本并重载',
      () => {
        void action(() => runtime.apply(versions!.value));
      },
      dialog,
    );
    const hint = hostDocument.createElement('p');
    hint.textContent =
      '版本固定保存，检查公告不会自动升级。切换会先下载并核对摘要，再确认重载。请保存全部草稿；会话日志与回滚 Journal 无法跨会话恢复。公告可能受 CDN 缓存影响。';
    dialog.append(hint);
    const source = hostDocument.createElement('p');
    source.textContent = ANNOUNCEMENT_URL;
    source.style.cssText = 'font-size:12px;overflow-wrap:anywhere;user-select:all';
    dialog.append(source);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled)'),
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && hostDocument.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && hostDocument.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    hostDocument.body.append(panel);
  }

  (window as Window & { MvuLoader?: { open: typeof open; registerCore: LoaderRuntime['registerCore'] } }).MvuLoader = {
    open,
    registerCore: options => runtime.registerCore(options),
  };
  appendInexistentScriptButtons([{ name: '📦版本管理', visible: true }]);
  eventOn(getButtonEvent('📦版本管理'), open);
  window.addEventListener('pagehide', () => panel?.remove(), { once: true });
  void runtime.start().then(() => {
    if (runtime.phase === 'failed') open();
  });
});
