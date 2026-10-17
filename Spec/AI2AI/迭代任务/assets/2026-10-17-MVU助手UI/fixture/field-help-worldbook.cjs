const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'], executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///' + path.join(__dirname, 'index.html').replaceAll('\\', '/'));
  await page.waitForFunction(() => window.ready);
  await page.evaluate(async () => {
    const c = window.test.tasks.snapshot();
    c.tasks[0].candidateBooks = [{ bookName: '角色资料', entryUids: [7, 12], nameRegexes: [] }];
    await window.test.tasks.replaceSettings(c);
    window.test.ui.darkMode = true;
  });
  const nav = async name => {
    const select = page.locator('.mobile-navigation select');
    if (await select.isVisible()) await select.selectOption({ label: name });
    else await page.locator('.workspace-nav').getByRole('button', { name, exact: true }).click();
  };
  await nav('任务');
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  const editor = page.locator('.task-editor-modal');
  const help = editor.locator('.field-label').filter({ hasText: /^API 配置/ }).locator('button');
  await help.hover();
  const tip = page.getByRole('tooltip');
  await tip.waitFor();
  await page.waitForTimeout(250);
  const checkPosition = async () => {
    const a = await help.boundingBox(), b = await tip.boundingBox();
    assert(b.x >= 0 && b.y >= 0 && b.x + b.width <= page.viewportSize().width + 1);
    assert(Math.abs((a.x + a.width / 2) - Math.max(b.x, Math.min(b.x + b.width, a.x + a.width / 2))) < 2);
    assert(Math.min(Math.abs(b.y + b.height - a.y), Math.abs(a.y + a.height - b.y)) <= 12, JSON.stringify({a,b}));
    const label = await help.locator('..').boundingBox();
    assert(Math.abs(a.y + a.height / 2 - (label.y + label.height / 2)) < 3, 'icon shares title line');
  };
  await checkPosition();
  await page.screenshot({ path: path.join(__dirname, 'field-help-desktop.png') });
  await help.focus();
  await help.press('Escape');
  await tip.waitFor({ state: 'detached' });
  await help.click();
  await tip.waitFor();
  await page.getByRole('button', { name: '输入世界书', exact: true }).click();
  const picker = editor.locator('.worldbook-picker').first();
  await picker.waitFor();
  assert.match(await picker.locator('.selected-entries').innerText(), /角色甲/);
  assert.match(await picker.locator('.selected-entries').innerText(), /角色乙/);
  assert(!/UID/.test(await picker.innerText()), 'internal identifiers stay out of the selection UI');
  assert(!(await picker.locator('.entry-panel').isVisible()));
  await picker.getByRole('button', { name: '选择条目 ▾', exact: true }).click();
  await picker.getByPlaceholder('搜索条目名称或内容').fill('版本');
  assert.match(await picker.locator('.selected-entries').innerText(), /角色甲/);
  await picker.getByRole('button', { name: '勾选搜索结果', exact: true }).click();
  assert.match(await picker.locator('.selected-entries').innerText(), /版本记录/);
  await picker.getByRole('button', { name: '移除 角色甲', exact: true }).click();
  assert(!/角色甲/.test(await picker.locator('.selected-entries').innerText()));
  await picker.getByPlaceholder('搜索条目名称或内容').fill('');
  assert(!(await picker.locator('.entry-choice').filter({ hasText: '角色甲' }).locator('input').isChecked()));
  assert(await picker.locator('.entry-choice').filter({ hasText: '角色乙' }).locator('input').isChecked());
  await picker.locator('details summary').first().click();
  assert(!(await picker.locator('.entry-choice').filter({ hasText: '角色甲' }).locator('input').isChecked()), 'content preview does not change selection');
  await page.screenshot({ path: path.join(__dirname, 'worldbook-selection-desktop.png') });
  for (const width of [550, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await picker.scrollIntoViewIfNeeded();
    const metrics = await picker.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    assert(metrics.scroll <= metrics.client + 1, JSON.stringify(metrics));
    const searchLabel = await picker.locator('.entry-panel .field-label').boundingBox();
    assert(searchLabel.width >= 85 && searchLabel.height <= 28, 'search heading stays on one line');
    await page.screenshot({ path: path.join(__dirname, `worldbook-selection-${width}.png`) });
  }
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.evaluate(() => { window.hostFail = true; });
  await picker.getByRole('button', { name: '刷新 / 重试', exact: true }).click();
  await picker.getByRole('alert').waitFor();
  assert.match(await picker.locator('.selected-entries').innerText(), /角色乙/);
  await page.evaluate(() => { window.hostFail = false; });
  await picker.getByRole('button', { name: '刷新 / 重试', exact: true }).click();
  await picker.getByRole('alert').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  // Reproduce the host: Vue runs in an iframe and renders into the parent document.
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    frame.id = 'script-realm';
    frame.style.display = 'none';
    frame.src = location.href;
    document.body.append(frame);
  });
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.ready);
  await page.evaluate(() => {
    const frame = document.querySelector('iframe');
    document.querySelector('#app').remove();
    document.body.append(frame.contentDocument.querySelector('#app'));
    for (const style of frame.contentDocument.querySelectorAll('style')) document.head.append(style.cloneNode(true));
  });
  await nav('任务');
  await page.getByRole('button', { name: '编辑', exact: true }).first().click();
  await help.hover();
  await tip.waitFor();
  await page.waitForTimeout(250);
  await checkPosition();
  for (const width of [550, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await help.hover();
    await tip.waitFor();
    await page.waitForTimeout(250);
    await checkPosition();
  }
  await page.setViewportSize({ width: 1200, height: 900 });
  await help.hover();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'field-help-parent-document.png') });
  await browser.close();
  console.log('PASS field help positioning/keyboard, selected names, search/add/remove, preview isolation, read failure and 1200/550/375 layouts');
})().catch(e => { console.error(e); process.exit(1); });
