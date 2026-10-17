const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.setDefaultTimeout(4000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + path.join(__dirname, 'index.html').replaceAll('\\', '/'));
    await page.waitForFunction(() => window.ready);
    await page.getByRole('button', { name: '运行结果', exact: true }).click();
    await page.evaluate(() => {
      const make = (id, status, rollback, writes, text = '') => ({
        version: 1, requestId: 'request-' + id, runId: id, trigger: { kind: 'manual' }, messageId: 0, chatId: '验收聊天', status,
        warnings: [], rollback: { status: rollback, errors: rollback === 'failed' ? ['目标被外部修改，无法补偿'] : [] },
        tasks: [{ taskId: 'task-' + id, taskName: id, status: rollback === 'failed' ? 'rollback_failed' : status, attempts: 1, writes, text }],
      });
      const write = status => [{ writeId: 'write', target: '角色资料 / 场景一', status, error: status === 'rollback_failed' ? '仍需恢复' : '' }];
      const failure = make('微信主动聊天', 'failed', 'not_needed', []);
      failure.trigger = { kind: 'event', eventName: 'Chat_On_WeChat' };
      failure.tasks[0].attempts = 2;
      failure.tasks[0].error = { phase: 'request', code: 'REQUEST_FAILED', message: '模型 wechat-mini 不存在，请确认模型名称', details: {
        connectionName: '验收 API', model: 'wechat-mini', endpoint: 'https://example.invalid/v1', elapsedMs: 1250,
        httpStatus: 200, backendCode: 'model_not_found', response: JSON.stringify({ error: '模型不存在' }).repeat(100),
      } };
      failure.tasks.push({ taskId: 'returned', taskName: '生成附加文本', status: 'succeeded', attempts: 1, writes: [], text: '长返回文本'.repeat(1000) });
      failure.status = 'partial';
      failure.warnings.push({ code: 'TEST_WARNING', message: '独立事件有部分任务未完成' });
      window.test.taskRunResults.value = [make('无写入失败', 'failed', 'not_needed', []), make('仅返回', 'succeeded', 'not_needed', [], '返回文本'),
        make('写入完成', 'succeeded', 'not_needed', write('committed')), make('已撤销', 'failed', 'completed', write('rolled_back')),
        make('残留失败', 'failed', 'failed', write('rollback_failed')), make('已取消', 'cancelled', 'not_needed', []), failure];
      window.test.activeTaskRuns.set('active', { id: 'active', identity: { messageId: 0 }, result: { trigger: {} }, controller: new AbortController(), cancelled: false });
      window.test.ui.darkMode = true;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.clipboardText = text; } } });
    });
    const cards = page.locator('article.run-card').filter({ has: page.locator('.result-heading') });
    const latest = cards.first();
    assert.equal(await cards.count(), 7);
    assert.equal(await page.locator('.run-controls[open]').count(), 0, 'manual tools do not crowd results');
    assert.equal(await page.locator('.task-details[open]').count(), 1, 'only latest task list starts expanded');
    assert.equal(await page.locator('.returned-text[open],.error-diagnostic[open],.diagnostic[open],.run-warnings[open]').count(), 0);
    assert.match(await latest.innerText(), /模型 wechat-mini 不存在/);
    assert.match(await latest.locator('.task-counts').innerText(), /2 个任务.*失败 1.*成功 1/);
    assert(!/https:\/\//.test(await latest.innerText()), 'request metadata is folded');
    assert(!(await latest.innerText()).includes('长返回文本'), 'long text is folded');
    const residue = cards.filter({ hasText: '目标被外部修改，无法补偿' });
    assert(await residue.getByRole('alert').isVisible());
    assert.match(await residue.locator('.writes').innerText(), /角色资料 \/ 场景一.*回滚失败/s);
    const body = await page.locator('.runs').innerText();
    for (const text of ['无成功写入记录。', '已返回文本，无成功写入记录。', '已写入 1 个目标', '已撤销本链需要回滚的提交。', '存在未恢复的修改或任务状态']) assert(body.includes(text), text);
    await page.getByRole('button', { name: '取消此运行', exact: true }).click();
    assert(await page.evaluate(() => window.test.activeTaskRuns.get('active').cancelled));
    await page.evaluate(() => window.test.activeTaskRuns.clear());
    for (const [width, height, dark] of [[1200, 900, true], [768, 800, false], [375, 812, true]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(dark => window.test.ui.darkMode = dark, dark);
      await page.locator('.run-controls').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const metrics = await page.locator('.runs').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
      assert(metrics.scroll <= metrics.width + 1, JSON.stringify(metrics));
      await page.screenshot({ path: path.join(__dirname, `runs-organized-${width}.png`) });
    }
    await page.setViewportSize({ width: 1200, height: 900 });
    await latest.locator('.error-diagnostic > summary').click();
    assert(await latest.locator('.error-diagnostic pre').isVisible());
    assert.match(await latest.locator('.error-diagnostic').innerText(), /验收 API.*wechat-mini/s);
    await latest.locator('.returned-text > summary').click();
    assert.match(await latest.locator('.returned-text pre').innerText(), /长返回文本/);
    await latest.locator('.diagnostic > summary').click();
    await latest.getByRole('button', { name: '复制诊断', exact: true }).click();
    const copied = JSON.parse(await page.evaluate(() => window.clipboardText));
    assert.equal(copied.tasks[0].error.details.backendCode, 'model_not_found');
    assert.equal(copied.tasks[1].text.length, 5000);
    const older = cards.filter({ hasText: '已返回文本，无成功写入记录。' }).last();
    await older.locator('.task-details > summary').focus();
    await older.locator('.task-details > summary').press('Enter');
    assert.equal(await older.locator('.task-details[open]').count(), 1, 'historical details support keyboard expansion');
    const before = await page.evaluate(() => JSON.stringify(window.messageData));
    await page.getByRole('button', { name: '清空显示记录', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.stringify(window.messageData)), before);
    assert.equal(await page.evaluate(() => window.test.taskRunResults.value.length), 0);
    assert.match(await page.locator('.runs').innerText(), /已写入数据和任务状态未被撤销/);
    await page.locator('.controls-summary').click();
    await page.evaluate(() => {
      const s = window.test.tasks.snapshot(); s.tasks[0].order = -1;
      s.tasks[0].output = { mode: 'write', writes: [{ target: { kind: 'worldbook', bookName: '只在发送前', entryName: '负序目标' } }] };
      window.test.tasks.settings = s;
    });
    assert(await page.getByRole('button', { name: '运行当前楼层任务', exact: true }).isDisabled());
    assert.match(await page.locator('.run-context').innerText(), /0 个候选任务/);
    assert(!(await page.locator('.run-context').innerText()).includes('负序目标'));
    await page.evaluate(() => {
      const s = window.test.tasks.snapshot(); s.tasks.push({ ...s.tasks[0], id: 'positive', name: '正序任务', order: 0, output: { mode: 'return' } });
      s.groups[0].taskIds.push('positive'); window.test.tasks.settings = s;
    });
    assert(await page.getByRole('button', { name: '运行当前楼层任务', exact: true }).isEnabled());
    assert.match(await page.locator('.run-context').innerText(), /1 个候选任务/);
    assert.deepEqual(errors, []);
    console.log('PASS actual runs UI: compact history, latest task list, folded text/diagnostics/tools, visible failure/residue/write targets, keyboard, copy, cancel, clear, manual selection and 1200/768/375 layouts');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
