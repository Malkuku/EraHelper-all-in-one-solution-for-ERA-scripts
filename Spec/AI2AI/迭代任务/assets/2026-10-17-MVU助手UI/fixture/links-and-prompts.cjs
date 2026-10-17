// Environment evidence: production App with a simulated host, no real API credentials.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    const nav = async name => {
      const select = page.locator('.mobile-navigation select');
      if (await select.isVisible()) await select.selectOption({ label: name });
      else await page.locator('.workspace-nav').getByRole('button', { name, exact: true }).click();
    };
    const save = async () => {
      await button('保存配置').click();
      await page.getByText('配置已保存。', { exact: true }).waitFor();
    };
    await page.route('https://second.invalid/v1/models', route => {
      assert.equal(route.request().headers().authorization, 'Bearer TEST_SECOND');
      return route.fulfill({ json: { data: [{ id: 'model-two' }, { id: 'model-three' }] } });
    });
    await page.route('http://localhost:7439/**', route => {
      const resource = new URL(route.request().url()).pathname;
      if (resource.endsWith('/encode')) return route.fulfill({ json: { ids: [1, 2, 3] } });
      if (resource.endsWith('/count')) return route.fulfill({ json: { token_count: 5 } });
      if (resource.endsWith('/generate')) return route.fulfill({ json: { choices: [{ message: { content: 'noise <v>RAW</v> suffix' } }] } });
      return route.fulfill({ path: path.join(__dirname, path.basename(resource)) });
    });
    await page.goto('http://localhost:7439/index.html');
    await page.waitForFunction(() => window.ready);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
    await nav('预设管理');
    await button('复制预设转换提示词').click();
    const conversion = await page.evaluate(() => window.copied);
    assert(conversion.startsWith('# SillyTavern 故事预设转非正文工作预设'));
    assert(conversion.includes('## 8. 验证与交付'));
    assert(conversion.includes('解除故事创作的默认任务绑定'));
    const originalPreset = await page.evaluate(() => window.test.tasks.snapshot().presets[0]);
    await nav('API 配置');
    const linkSection = page.locator('.form-section').filter({ has: page.getByRole('heading', { name: '链接设置', exact: true }) });
    assert(await linkSection.getByLabel('更新密钥', { exact: true }).isVisible());
    assert(await linkSection.getByRole('button', { name: '测试连接', exact: true }).isVisible());
    await page.getByLabel('链接名称', { exact: true }).fill('主链接');
    await page.getByLabel('更新密钥', { exact: true }).fill('TEST_FIRST');
    await button('+ 新建链接').click();
    await page.getByLabel('链接名称', { exact: true }).fill('备用链接');
    await page.getByLabel('API 根地址', { exact: true }).fill('https://second.invalid/v1');
    await page.getByLabel('模型', { exact: true }).fill('model-two');
    await page.getByLabel('更新密钥', { exact: true }).fill('TEST_SECOND');
    await button('获取模型列表').click();
    await page.getByText('已获取 2 个模型。', { exact: true }).waitFor();
    await page.getByLabel('可用模型（2 个）').selectOption('model-three');
    await save();
    let config = await page.evaluate(() => window.test.tasks.snapshot());
    const first = config.connections[0].links[0], second = config.connections[0].links[1];
    assert.equal(config.schemaVersion, 4);
    assert.equal(config.connections.length, 1);
    assert.equal(config.connections[0].activeLinkId, second.id);
    assert.equal(second.model, 'model-three');
    assert.deepEqual(config.presets[0], originalPreset, 'copying never edits raw preset');
    assert.equal(JSON.stringify(config).includes('TEST_'), false);
    await page.getByLabel('当前链接', { exact: true }).selectOption(first.id);
    assert.equal(await page.getByLabel('API 根地址', { exact: true }).inputValue(), first.baseUrl);
    assert.equal(await page.getByLabel('模型', { exact: true }).inputValue(), first.model);
    await save();
    await page.evaluate(() => window.test.tasks.load());
    assert.equal(await page.evaluate(ref => window.test.tasks.getSecret(ref), second.secretRef), 'TEST_SECOND');
    assert.equal(await page.evaluate(ref => window.test.tasks.getSecret(ref), first.secretRef), 'TEST_FIRST');
    for (const width of [1200, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await nav('API 配置');
      assert(await page.getByLabel('当前链接', { exact: true }).isVisible());
      assert(await button('+ 新建链接').isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 1200, height: 900 });
    await nav('任务');
    await page.locator('.task-row-main').first().click();
    await button('显式任务正则').click();
    const regexSwitch = page.locator('input[data-config-key="useTavernRegex"]');
    for (const dark of [false, true]) {
      await page.evaluate(value => { window.test.ui.darkMode = value; }, dark);
      for (const width of [1200, 518, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await regexSwitch.scrollIntoViewIfNeeded();
        const layout = await regexSwitch.evaluate(input => {
          const label = input.closest('label');
          return { direction: getComputedStyle(label).flexDirection,
            input: input.getBoundingClientRect().toJSON(),
            text: label.querySelector('.field-label').getBoundingClientRect().toJSON(),
            help: label.querySelector('.tooltip-trigger').getBoundingClientRect().toJSON(),
            overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.equal(layout.direction, 'row');
        assert(layout.text.x > layout.input.x + layout.input.width);
        assert(Math.abs(layout.input.y + layout.input.height / 2 - layout.help.y - layout.help.height / 2) <= 3, JSON.stringify(layout));
        assert.equal(layout.overflow, false);
      }
    }
    await regexSwitch.check();
    await page.getByText('自动应用酒馆当前正则', { exact: true }).click();
    assert.equal(await regexSwitch.isChecked(), false, 'label toggles the checkbox');
    await regexSwitch.locator('..').locator('.tooltip-trigger').click();
    await page.getByRole('tooltip').filter({ hasText: '仅影响本任务输入' }).waitFor();
    assert.equal(await regexSwitch.isChecked(), false, 'help does not toggle the checkbox');
    await page.setViewportSize({ width: 1200, height: 900 });
    await button('结果处理').click();
    assert.equal(await page.getByLabel('输出方式', { exact: true }).count(), 0, 'no bypass output modes');
    await button('+ 添加写入').click();
    await page.getByLabel('目标', { exact: true }).selectOption('event');
    assert.equal(await page.getByLabel('广播事件名', { exact: true }).count(), 0, 'no separate receiver event configuration');
    await page.getByLabel('广播使用的附加事件名', { exact: true }).fill('frontend:sample');
    await page.getByRole('status').filter({ hasText: '广播频道：frontend:sample:output' }).waitFor();
    assert.equal(await page.getByLabel('写入操作', { exact: true }).count(), 0, 'broadcast has no text append/replace operation');
    await button('+ 添加写入').click();
    assert.deepEqual(await page.getByLabel('目标', { exact: true }).evaluateAll(selects => selects.map(select => select.value)), ['event', 'message'], 'broadcast and text targets can coexist');
    await page.getByRole('button', { name: '删除写入', exact: true }).last().click();
    for (const width of [518, 375]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.getByLabel('广播使用的附加事件名', { exact: true }).isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 1200, height: 900 });
    await button('+ 提取正则').click();
    await page.getByLabel('响应提取正则', { exact: true }).fill('/<v>.*?<\/v>/g');
    await button('复制前端联动提示词').click();
    const regularRules = await page.evaluate(() => window.copied);
    assert(regularRules.includes('payload.text'));
    assert(!regularRules.includes('full-ui-acceptance'));
    assert(!regularRules.includes('frontend:processed'), 'generic rules never bake the current target channel into code');
    await button('基础与提示词').click();
    await page.getByText('触发与高级参数', { exact: true }).click();
    await page.getByLabel('附加事件名', { exact: true }).fill('frontend:changed');
    await button('结果处理').click();
    await page.getByRole('status').filter({ hasText: '广播频道：frontend:changed:output' }).waitFor();
    await button('复制前端联动提示词').click();
    const eventRules = await page.evaluate(() => window.copied);
    assert.equal(eventRules, regularRules, 'trigger changes do not change generic listener instructions');
    await page.evaluate(() => { window.getScriptId = () => 'another-installed-instance'; });
    await button('复制前端联动提示词').click();
    assert.equal(await page.evaluate(() => window.copied), regularRules, 'instructions do not depend on installation identity');
    await page.evaluate(() => { window.getScriptId = () => 'full-ui-acceptance'; });
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw Error('DENIED'); }; });
    await button('复制前端联动提示词').click();
    await page.getByText('复制失败，请展开完整提示词后手动复制。', { exact: true }).waitFor();
    await button('关闭任务编辑').click();
    await save();
    await page.evaluate(async () => {
      const c = window.test.tasks.snapshot();
      c.presets[0].raw.prompts = [{ identifier: 'chatHistory', name: 'history', role: 'system', marker: true }];
      c.presets[0].raw.prompt_order = [{ character_id: 100001, order: [{ identifier: 'chatHistory', enabled: true }] }];
      c.tasks[0].historyDepth = 0;
      c.tasks[0].regexRules = [{ id: 'response', stage: 'response', pattern: 'RAW', flags: 'g', replacement: 'DONE', enabled: true }];
      await window.test.tasks.replaceSettings(c);
      const prior = window.SillyTavern.getContext;
      window.SillyTavern.getContext = () => ({ ...prior(), name1: 'Player', name2: 'Char', substituteParams: text => text, getRequestHeaders: () => ({ 'Content-Type': 'application/json' }) });
      window.events = [];
      window.actualRun = await window.test.runTaskChain({ messageId: 0, trigger: { kind: 'manual' }, requestId: 'browser-broadcast' });
    });
    const actual = await page.evaluate(() => ({ result: window.actualRun, events: window.events }));
    assert.equal(actual.result.status, 'succeeded', JSON.stringify(actual.result));
    const delivered = actual.events.filter(([name]) => name === 'frontend:changed:output');
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0][1].text, '<v>DONE</v>', 'consumer receives response-processed and extracted text');
    assert.equal(delivered[0][1].scriptId, 'full-ui-acceptance');
    assert.equal(delivered[0][1].requestId, 'browser-broadcast');
    assert.equal(actual.result.tasks[0].writes[0].status, 'delivered');
    await page.evaluate(() => window.test.tasks.load());
    const reloaded = await page.evaluate(() => window.test.tasks.snapshot());
    assert.deepEqual(reloaded.tasks[0].output.writes[0].target, { kind: 'event' });
    assert.equal(reloaded.tasks[0].eventName, 'frontend:changed');
    assert.equal(Object.hasOwn(reloaded.tasks[0].output, 'mode'), false);
    await nav('API 配置');
    await button('删除此链接').click();
    await save();
    config = await page.evaluate(() => window.test.tasks.snapshot());
    assert.equal(config.connections[0].activeLinkId, null);
    assert.equal(config.connections[0].links.length, 1);
    assert.equal(config.tasks[0].connectionId, 'api');
    assert.equal(await page.evaluate(ref => window.test.tasks.getSecret(ref), second.secretRef), 'TEST_SECOND');
    await nav('预设管理');
    await button('删除预设').click();
    assert(await button('复制预设转换提示词').isVisible(), 'conversion tool available without any preset');
    assert.deepEqual(errors, []);
    console.log('PASS production App: processed per-target broadcast to trigger:output through real runtime; mixed target UI, no output modes/extra channel/installation ID binding; generic prompt copy/failure; link credentials; responsive light/dark checkbox alignment');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
