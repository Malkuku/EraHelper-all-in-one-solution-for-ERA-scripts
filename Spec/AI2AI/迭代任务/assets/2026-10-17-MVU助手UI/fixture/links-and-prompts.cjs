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
    await page.goto('file:///' + path.join(__dirname, 'index.html').replaceAll('\\', '/'));
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
    assert.equal(config.schemaVersion, 3);
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
    await page.getByLabel('输出方式', { exact: true }).selectOption('event_result');
    await button('复制前端联动提示词').click();
    const regularRules = await page.evaluate(() => window.copied);
    assert(regularRules.includes('kat_task_chain:result'));
    assert(regularRules.includes('const taskId = "task"'));
    assert(regularRules.includes('await KatTaskAPI.run({ requestId, messageId, taskId })'));
    await button('基础与提示词').click();
    await page.getByText('触发与高级参数', { exact: true }).click();
    await page.getByLabel('附加事件名', { exact: true }).fill('frontend:sample');
    await button('结果处理').click();
    await button('复制前端联动提示词').click();
    const eventRules = await page.evaluate(() => window.copied);
    assert(eventRules.includes('frontend:sample:result'));
    assert(eventRules.includes('await eventEmit(eventName, { requestId, messageId, taskId })'));
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw Error('DENIED'); }; });
    await button('复制前端联动提示词').click();
    await page.getByText('复制失败，请展开完整提示词后手动复制。', { exact: true }).waitFor();
    await button('关闭任务编辑').click();
    await save();
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
    console.log('PASS production App: two links/model list/credentials/switch/save/reload/delete; preset and task prompt copy/location/content/failure; regex checkbox/text/help alignment in light/dark at 1200/518/375, label toggling and help isolation; responsive 1200/768/375');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
