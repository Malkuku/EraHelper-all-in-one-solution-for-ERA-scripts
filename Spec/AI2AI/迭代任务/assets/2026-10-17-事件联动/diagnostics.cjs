const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [], logs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => logs.push(message.text()));
    await page.goto('file:///' + path.join(__dirname, 'index.html').replaceAll('\\', '/'));
    await page.waitForFunction(() => window.ready);
    await page.getByRole('button', { name: '运行结果', exact: true }).click();
    await page.locator('.controls-summary').click();
    await page.evaluate(async () => {
      const w = window, config = w.test.tasks.snapshot();
      config.presets[0].raw.prompts = [{ identifier: 'chatHistory', role: 'system', marker: true }];
      config.presets[0].raw.prompt_order = [{ character_id: 100001, order: [{ identifier: 'chatHistory', enabled: true }] }];
      Object.assign(config.tasks[0], { name: '微信主动聊天', enabled: false, eventName: 'Chat_On_WeChat', retryCount: 1, output: { mode: 'event_result' } });
      await w.test.tasks.replaceSettings(config);
      w.test.ui.darkMode = true;
      const priorFetch = w.fetch;
      w.fetch = async (input, init) => new URL(input).pathname.endsWith('/generate')
        ? new Response(JSON.stringify({ error: { message: '模型 wechat-mini 不存在，请确认模型名称', code: 'model_not_found', type: 'invalid_request_error' } }), { status: 200 })
        : priorFetch(input, init);
    });
    await page.getByRole('combobox', { name: '运行范围', exact: true }).selectOption('event');
    await page.getByRole('combobox', { name: '测试事件', exact: true }).selectOption('Chat_On_WeChat');
    await page.getByRole('button', { name: '测试此事件', exact: true }).click();
    await page.waitForFunction(() => window.test.taskRunResults.value.length === 1);
    const card = page.locator('.run-card');
    const notice = page.getByRole('complementary', { name: '任务状态通知' });
    await notice.waitFor();
    assert.match(await notice.innerText(), /任务失败/);
    assert(await notice.evaluate(el => el.matches(':popover-open')), 'notification uses the host top layer');
    assert.equal(await notice.locator('.notice-details').getAttribute('open'), null, 'new notifications start compact');
    assert((await notice.boundingBox()).height < 80, 'compact failure does not cover the workspace');
    await notice.locator('.notice-heading').click();
    await notice.locator('.mvu-run-log summary').click();
    for (const expected of ['模型请求内容', '后端原始响应', '生成失败']) assert((await notice.innerText()).includes(expected), expected);
    await notice.getByRole('button', { name: '关闭此通知' }).click();
    await notice.waitFor({ state: 'detached' });
    const text = await card.innerText();
    for (const expected of ['模型 wechat-mini 不存在', 'HTTP 200', '尝试 2 次', '技术详情']) assert(text.includes(expected), expected);
    assert.equal(await card.locator('.error-diagnostic[open]').count(), 0, 'backend response is initially folded');
    await card.locator('.error-diagnostic > summary').click();
    for (const expected of ['model_not_found', '验收 API', '验收模型', 'https://example.invalid/v1']) assert((await card.innerText()).includes(expected), expected);
    assert(await card.locator('.error-diagnostic pre').isVisible(), 'full backend response remains available');
    await card.locator('.diagnostic > summary').click();
    await card.getByRole('button', { name: '复制诊断', exact: true }).click();
    const copied = JSON.parse(await page.evaluate(() => window.clipboardText));
    assert.equal(copied.tasks[0].error.details.backendCode, 'model_not_found');
    assert.match(copied.tasks[0].error.details.response, /wechat-mini/);
    assert(copied.logs.some(entry => entry.message === '模型请求内容'));
    await card.locator('.mvu-run-log summary').click();
    assert.match(await card.locator('.mvu-run-log').innerText(), /后端原始响应/);
    for (const expected of ['运行准入', '生成尝试未完成', '生成失败', '运行结算']) assert(logs.some(log => log.includes(expected)), expected);
    await card.screenshot({ path: path.join(__dirname, 'failure-diagnostics-desktop.png') });
    await page.setViewportSize({ width: 375, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await card.screenshot({ path: path.join(__dirname, 'failure-diagnostics-mobile.png') });
    // Keep a real production runtime request pending while the workspace is closed.
    await page.evaluate(() => {
      const priorFetch = window.fetch;
      window.fetch = async (input, init) => new URL(input).pathname.endsWith('/generate')
        ? await new Promise(resolve => { window.releaseRequest = () => resolve(new Response(JSON.stringify({ choices: [{ message: { content: '<b>SUCCESS_OUTPUT</b>' } }] }))); })
        : priorFetch(input, init);
    });
    await page.getByRole('button', { name: '测试此事件', exact: true }).click();
    await page.waitForFunction(() => window.releaseRequest);
    await page.evaluate(() => { window.test.ui.showUI = false; });
    await notice.waitFor();
    assert.match(await notice.innerText(), /任务处理中/);
    assert.equal(await notice.locator('.notice-details').getAttribute('open'), null);
    await page.waitForTimeout(5200);
    assert(await notice.isVisible(), 'running notification must not time out');
    assert((await notice.boundingBox()).height < 80, 'pending notification remains a compact strip');
    assert.equal(await notice.getByRole('button', { name: '关闭此通知' }).count(), 0);
    await page.screenshot({ path: path.join(__dirname, 'notification-running-mobile.png') });
    await page.evaluate(() => window.releaseRequest());
    await page.waitForFunction(() => window.test.taskRunResults.value.length === 2);
    assert.match(await notice.innerText(), /任务完成/);
    assert.equal(await notice.locator('section').count(), 1, 'same card is updated on settlement');
    assert.equal(await notice.locator('.notice-details').getAttribute('open'), null, 'response updates status without forcing details open');
    await notice.locator('.notice-heading').focus();
    await page.keyboard.press('Enter');
    await notice.locator('.mvu-run-log summary').click();
    assert.match(await notice.innerText(), /SUCCESS_OUTPUT/);
    assert.equal(await notice.locator('b').count(), 0, 'output must be escaped text');
    assert.equal(await notice.locator('.mvu-run-log').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    await page.screenshot({ path: path.join(__dirname, 'notification-success-mobile.png') });
    await notice.locator('.notice-heading').click();
    assert((await notice.boundingBox()).height < 80, 'expanded logs can be collapsed again');
    await notice.getByRole('button', { name: '关闭此通知' }).click();
    await notice.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log('PASS: production UI visible backend reason, folded technical details with complete response, copy diagnostics, console retries and mobile layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
