// Browser fixture: actual ES modules and Blob import, deterministic CDN/host APIs.
/* eslint-disable @typescript-eslint/no-require-imports -- This Node CommonJS fixture loads the locally installed Playwright tool by configurable path. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const root = path.resolve(__dirname, '../..');

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><title>Loader fixture</title>'); return; }
    if (req.url === '/frame') { res.setHeader('content-type', 'text/html'); res.end(`<!doctype html><script>
      parent.fixtureBoots=(parent.fixtureBoots||0)+1;
      window.$=fn=>fn(); window.getScriptId=()=> 'original-script-id';
      window.getVariables=options=>{parent.fixtureReads.push(options);return structuredClone(parent.fixtureVariables)};
      window.updateVariablesWith=(fn,options)=>{parent.fixtureWrites.push(options);parent.fixtureVariables=fn(structuredClone(parent.fixtureVariables))};
      window.appendInexistentScriptButtons=buttons=>parent.fixtureButtons.push(...buttons);
      window.getButtonEvent=name=>name; window.eventOn=(name,fn)=>{parent.fixtureEvents[name]=fn};
      </script><script type="module" src="/entry.js"></script>`); return; }
    if (req.url === '/entry.js' && process.env.LOADER_BUNDLE) { res.setHeader('content-type', 'text/javascript'); res.end(fs.readFileSync(process.env.LOADER_BUNDLE)); return; }
    const name = { '/runtime.js': 'runtime.ts', '/runtime': 'runtime.ts', '/protocol': 'protocol.ts', '/entry.js': 'index.ts' }[req.url];
    if (!name) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type', 'text/javascript');
    res.end(ts.transpileModule(fs.readFileSync(path.join(root, 'src/MVU加载器', name), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line import-x/no-unresolved -- Browser HTTP module served by this fixture server.
      const { LoaderRuntime } = await import('/runtime.js');
      // eslint-disable-next-line import-x/no-unresolved -- Browser HTTP module served by this fixture server.
      const protocol = await import('/protocol');
      const ok = (value, label) => { if (!value) throw Error(label); };
      const rejects = async (fn, label) => { let rejected = false; try { await fn(); } catch { rejected = true; } ok(rejected, label); };
      const bytes = new TextEncoder().encode('globalThis.fixtureExecutions=(globalThis.fixtureExecutions||0)+1; globalThis.fixtureIdentity=getScriptId(); export const ready=true;');
      const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      const release = { version: '2.0.0', date: '2026-10-18', changes: ['更新说明'], artifactCommit: 'a'.repeat(40), sha256 };
      const newer = { ...release, version: '2.0.1', artifactCommit: 'b'.repeat(40) };
      const announcement = { schemaVersion: 1, latest: newer.version, versions: [release, newer] };
      let count = 0;
      const check = async fn => { await fn(); count++; };
      window.getScriptId = () => 'original-script-id';
      const fixture = (stored = undefined, options = {}) => {
        const calls = [], writes = [], confirmations = [];
        let reloads = 0, executions = 0;
        const host = {
          readSelection: () => stored,
          saveSelection: value => { writes.push(structuredClone(value)); stored = structuredClone(value); },
          execute: async data => { executions++; const url = URL.createObjectURL(new Blob([data], { type: 'text/javascript' })); try { await import(url); } finally { URL.revokeObjectURL(url); } },
          confirm: message => { confirmations.push(message); return true; },
          reload: () => reloads++, changed: () => {},
          fetcher: async url => { calls.push(String(url)); return String(url) === protocol.ANNOUNCEMENT_URL ? new Response(JSON.stringify(announcement)) : new Response(bytes); },
          ...options,
        };
        const runtime = new LoaderRuntime(host);
        return { runtime, host, calls, writes, confirmations, get reloads() { return reloads; }, get executions() { return executions; } };
      };
      await check(async () => {
        const f = fixture(); await f.runtime.start();
        ok(f.runtime.selection.version === '2.0.1', 'first install selects latest');
        ok(f.writes.length === 1 && f.writes[0].artifactCommit === newer.artifactCommit, 'complete descriptor saved');
        ok(f.calls[1] === protocol.coreUrl(newer), 'fixed commit address');
        ok(window.fixtureIdentity === 'original-script-id', 'actual module retains original host identity');
        ok(f.executions === 1 && f.runtime.phase === 'waiting-ready', 'executes actual Blob ES module once');
        await rejects(() => f.runtime.start(), 'cannot execute core twice');
        ok(f.executions === 1, 'second start zero extra execution');
      });
      await check(async () => {
        const f = fixture(release, { fetcher: async url => { ok(String(url) === protocol.coreUrl(release), 'restart does not fetch announcement'); return new Response(bytes); } });
        await f.runtime.start(); ok(f.runtime.selection.version === release.version && f.writes.length === 0, 'restart pins persisted version');
      });
      for (const failure of ['http', 'digest', 'network']) await check(async () => {
        const f = fixture(release, { fetcher: async () => { if (failure === 'network') throw Error('network'); return new Response(failure === 'digest' ? 'corrupt' : bytes, { status: failure === 'http' ? 503 : 200 }); } });
        await f.runtime.start(); ok(f.runtime.phase === 'failed' && f.executions === 0, `${failure} zero execution`);
        ok(f.runtime.message.includes('失败'), 'failure visible'); f.runtime.reload(); ok(f.reloads === 1, 'failure retry reload accessible');
      });
      await check(async () => {
        let partialExecutions = 0;
        const f = fixture(release, { execute: async () => { partialExecutions++; throw Error('partial core failed'); } });
        await f.runtime.start(); ok(f.runtime.phase === 'failed' && partialExecutions === 1, 'partial execution failure visible');
        await rejects(() => f.runtime.start(), 'partial execution cannot rerun');
        await f.runtime.check(); await f.runtime.apply('2.0.1');
        ok(f.reloads === 1 && f.writes[0].version === '2.0.1', 'partial execution failure can select verified recovery version and reload');
        ok(f.confirmations[0].includes('副作用'), 'failure recovery warns about partial side effects');
        ok(partialExecutions === 1, 'failure recovery does not execute second core in current iframe');
      });
      await check(async () => {
        const f = fixture(release); await f.runtime.start(); await f.runtime.check();
        await rejects(() => f.runtime.apply('2.0.1'), 'cannot update before core reports ready');
        let busy = true; f.runtime.registerCore({ canReload: () => !busy });
        await rejects(() => f.runtime.apply('2.0.1'), 'busy blocks update');
        ok(f.writes.length === 0 && f.reloads === 0, 'busy leaves selection intact');
        busy = false; await f.runtime.apply('2.0.1');
        ok(f.writes.length === 1 && f.reloads === 1, 'explicit update saves and reloads');
        ok(f.confirmations.some(text => text.includes('草稿') && text.includes('Journal')), 'confirm explains session loss');
      });
      for (const race of ['download', 'confirm']) await check(async () => {
        let busy = false;
        const f = fixture(release); await f.runtime.start(); f.runtime.registerCore({ canReload: () => !busy }); await f.runtime.check();
        if (race === 'download') f.host.fetcher = async () => { await Promise.resolve(); busy = true; return new Response(bytes); };
        else f.host.confirm = () => { busy = true; return true; };
        await rejects(() => f.runtime.apply('2.0.1'), `${race} race blocked`);
        ok(f.writes.length === 0 && f.reloads === 0 && !f.runtime.working, 'late busy causes no mutation');
      });
      await check(async () => {
        const f = fixture(release, { confirm: () => false }); await f.runtime.start(); f.runtime.registerCore({ canReload: () => true }); await f.runtime.check(); await f.runtime.apply('2.0.1');
        ok(f.writes.length === 0 && f.reloads === 0, 'cancel keeps selected version');
      });
      await check(async () => {
        const f = fixture(release); await f.runtime.start(); f.runtime.registerCore({ canReload: () => true }); await f.runtime.check();
        let finish; f.host.fetcher = async () => { await new Promise(resolve => finish = resolve); return new Response(bytes); };
        const applying = f.runtime.apply('2.0.1');
        await rejects(() => f.runtime.apply('2.0.1'), 'parallel apply explicitly refused'); finish(); await applying;
        ok(f.writes.length === 1 && f.reloads === 1, 'parallel apply cannot save/reload twice');
      });
      await check(async () => {
        const f = fixture(release); await f.runtime.start(); f.runtime.registerCore({ canReload: () => true });
        for (const body of ['broken JSON', JSON.stringify({ ...announcement, latest: '3.0.0' }), JSON.stringify({ ...announcement, versions: [release, release] })]) {
          f.host.fetcher = async () => new Response(body); await rejects(() => f.runtime.check(), 'bad announcement rejected');
        }
        f.host.fetcher = async () => new Response('unavailable', { status: 503 }); await rejects(() => f.runtime.check(), 'HTTP announcement failure rejected');
        ok(f.runtime.selection.version === release.version && f.reloads === 0, 'failed checks preserve running core');
        f.host.fetcher = async () => new Response(JSON.stringify({ schemaVersion: 1, latest: release.version, versions: [release] })); await f.runtime.check();
        ok(f.runtime.message.includes(release.version) && f.runtime.message.includes('未自动切换'), 'old cached result described accurately');
        f.host.fetcher = async () => new Response(JSON.stringify({ schemaVersion: 1, latest: release.version, versions: [{ ...release, artifactCommit: 'c'.repeat(40) }] }));
        await rejects(() => f.runtime.check(), 'announcement cannot redefine pinned version');
      });
      await check(async () => {
        for (const altered of [{ version: '../2.0.0' }, { version: '02.0.0' }, { version: '2.0.0\n' }, { artifactCommit: 'master' }, { artifactCommit: 'A'.repeat(40) }, { artifactCommit: 'a'.repeat(40) + '\n' }, { date: '2026-02-29' }, { sha256: 'z'.repeat(64) }, { sha256: sha256 + '\n' }, { changes: [] }]) await rejects(() => Promise.resolve(protocol.coreUrl({ ...release, ...altered })), 'unsafe descriptor rejected');
        const f = fixture({ ...release, artifactCommit: 'master' }); await f.runtime.start(); ok(f.executions === 0 && f.calls.length === 0, 'corrupt storage no remote execution');
      });
      return { count, executedModules: window.fixtureExecutions };
    });
    assert(result.executedModules > 0);
    console.log(`PASS: ${result.count} browser loader contracts; actual Blob ES modules, pinned persistence, failure/retry, busy races, immutable identity`);
    const core = 'parent.fixtureExecuted=(parent.fixtureExecuted||0)+1;parent.fixtureIdentity=getScriptId();window.MvuLoader.registerCore({canReload:()=>!parent.fixtureBusy});export const ready=true;';
    const crypto = require('node:crypto');
    const release = { version: '2.0.0', date: '2026-10-18', changes: ['核心fixture说明'], artifactCommit: 'a'.repeat(40), sha256: crypto.createHash('sha256').update(core).digest('hex') };
    let corrupt = false, announcementFailure = false, announcementCalls = 0;
    await page.route('https://cdn.jsdelivr.net/**', route => {
      if (route.request().url().endsWith('/latest.json')) { announcementCalls++; return route.fulfill({ status: announcementFailure ? 503 : 200, json: { schemaVersion: 1, latest: release.version, versions: [release] } }); }
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: corrupt ? 'corrupt' : core });
    });
    async function mount(stored, fail = false) {
      corrupt = fail; announcementFailure = false; announcementCalls = 0;
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.evaluate(stored => {
        window.fixtureVariables = { settings: { keep: true }, api_keys: { keep: 'secret-fixture' }, ...(stored ? { mvu_loader_selection: stored } : {}) };
        window.fixtureReads = []; window.fixtureWrites = []; window.fixtureButtons = [{ name: 'existing-button' }]; window.fixtureEvents = {};
        window.fixtureBoots = 0;
        window.fixtureOpened = []; window.fixtureConfirmations = []; window.fixtureBusy = false;
        window.open = (...args) => { window.fixtureOpened.push(args); return null; };
        window.confirm = text => { window.fixtureConfirmations.push(text); return false; };
        const frame = document.createElement('iframe'); frame.src = '/frame'; document.body.append(frame);
      }, stored);
      await page.waitForFunction(() => Boolean(window.fixtureEvents['📦版本管理']));
    }
    await mount(undefined, true);
    const dialog = page.getByRole('dialog', { name: 'MVU 版本管理' });
    await dialog.getByRole('status').filter({ hasText: /SHA256/ }).waitFor();
    assert.equal(await page.evaluate(() => window.fixtureExecuted || 0), 0);
    assert.equal(await dialog.isVisible(), true, 'failure management remains reachable in parent document');
    announcementFailure = true;
    await dialog.getByRole('button', { name: '刷新公告 CDN', exact: true }).click();
    await dialog.getByRole('status').filter({ hasText: /验证码.*|HTTP 503/ }).waitFor();
    const refreshText = await dialog.getByRole('status').textContent();
    assert(refreshText.includes('尚未清除缓存') && refreshText.includes('HTTP 503'));
    assert(refreshText.includes('/releases/mvu/latest.json'));
    assert.equal(await page.evaluate(() => window.fixtureOpened[0][0]), 'https://www.jsdelivr.com/tools/purge');
    assert.equal(await page.evaluate(() => window.fixtureExecuted || 0), 0);
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => window.fixtureEvents['📦版本管理']()); await dialog.waitFor();
    announcementFailure = false; corrupt = false;
    await dialog.getByRole('button', { name: '检查更新', exact: true }).click();
    await dialog.getByRole('status').filter({ hasText: /本次读取/ }).waitFor();
    assert((await dialog.textContent()).includes('核心fixture说明'));
    await dialog.getByRole('button', { name: '应用选定版本并重载', exact: true }).click();
    await dialog.getByRole('status').filter({ hasText: /已取消/ }).waitFor();
    assert.equal(await page.evaluate(() => window.fixtureConfirmations.length), 1);
    await page.evaluate(() => { window.confirm = () => true; });
    await dialog.getByRole('button', { name: '应用选定版本并重载', exact: true }).click();
    await page.waitForFunction(() => window.fixtureBoots === 2 && window.fixtureExecuted === 1);
    assert.equal(await page.evaluate(() => window.fixtureWrites.length), 2, 'recovery saves selection then reloads iframe before executing');
    await mount(release);
    await page.waitForFunction(() => window.fixtureExecuted === 1);
    assert.equal(announcementCalls, 0, 'DOM entry restart does not depend on latest announcement');
    await page.evaluate(() => window.fixtureEvents['📦版本管理']());
    await dialog.getByRole('status').filter({ hasText: /正在运行 2.0.0/ }).waitFor();
    assert.equal(await page.evaluate(() => window.fixtureIdentity), 'original-script-id');
    assert.equal(await page.evaluate(() => window.fixtureWrites.length), 0);
    assert.equal(await page.evaluate(() => window.fixtureButtons[0].name), 'existing-button');
    assert.deepEqual(await page.evaluate(() => window.fixtureReads), [{ type: 'script', script_id: 'original-script-id' }]);
    assert.deepEqual(await page.evaluate(() => [window.fixtureVariables.settings, window.fixtureVariables.api_keys]), [{ keep: true }, { keep: 'secret-fixture' }]);
    await page.setViewportSize({ width: 375, height: 800 });
    const rect = await dialog.boundingBox(); assert(rect.width <= 375 && rect.x >= 0);
    await mount(undefined);
    await page.waitForFunction(() => window.fixtureExecuted === 1);
    assert.equal(await page.evaluate(() => window.fixtureWrites.length), 1);
    assert.deepEqual(await page.evaluate(() => Object.keys(window.fixtureVariables).sort()), ['api_keys', 'mvu_loader_selection', 'settings']);
    assert.deepEqual(await page.evaluate(() => window.fixtureVariables.mvu_loader_selection), release);
    console.log(`PASS: loader ${process.env.LOADER_BUNDLE ? 'production artifact' : 'source modules'} DOM/iframe fixture; parent management on failure, refresh honesty, cancel, original identity, namespaced persistence, mobile layout`);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
