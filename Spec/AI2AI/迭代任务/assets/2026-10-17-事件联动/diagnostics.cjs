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
    const text = await card.innerText();
    for (const expected of ['模型 wechat-mini 不存在', 'model_not_found', 'HTTP 200', '验收 API', '验收模型', 'https://example.invalid/v1', '尝试 2 次', '失败详情']) assert(text.includes(expected), expected);
    assert(await card.locator('details[open] pre').isVisible(), 'backend response is initially visible');
    await card.getByRole('button', { name: '复制诊断', exact: true }).click();
    const copied = JSON.parse(await page.evaluate(() => window.clipboardText));
    assert.equal(copied.tasks[0].error.details.backendCode, 'model_not_found');
    assert.match(copied.tasks[0].error.details.response, /wechat-mini/);
    for (const expected of ['运行准入', '生成尝试未完成', '生成失败', '运行结算']) assert(logs.some(log => log.includes(expected)), expected);
    await card.screenshot({ path: path.join(__dirname, 'failure-diagnostics-desktop.png') });
    await page.setViewportSize({ width: 375, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await card.screenshot({ path: path.join(__dirname, 'failure-diagnostics-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: production UI backend failure reason, request metadata, expanded response, copy diagnostics, console retries and mobile layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
