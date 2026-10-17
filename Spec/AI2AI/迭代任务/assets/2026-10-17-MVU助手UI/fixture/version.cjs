// Retirement gate for the former character-data updater.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('node:path');
const metadata = require(path.resolve(__dirname, '../../../../../../src/MVU助手/release.json'));
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///' + path.join(__dirname,'index.html').replaceAll(String.fromCharCode(92),'/'));
  await page.waitForFunction(()=>window.ready);
  const before=await page.evaluate(()=>({messages:window.messageData,settings:window.scriptVariables}));
  assert(before.settings.era_data_rule.version_control.enable);
  assert.equal(await page.evaluate(()=>window.test.router.hasRoute('VersionUpdater')),false);
  for(const width of [1200,375]) {
   await page.setViewportSize({width,height:812});
   assert.deepEqual(await page.getByRole('navigation', { name: '主要功能', exact: true }).getByRole('button').allTextContents(),['任务工作台','变量编辑','关于']);
   await page.getByRole('button',{name:'关于',exact:true}).click();
   await page.getByRole('heading',{name:'作者信息',exact:true}).waitFor();
   assert.equal(await page.locator('.version-badge').innerText(),'v'+metadata.version);
   const release = page.locator('.history-item').first();
   assert.equal(await release.getByRole('heading').innerText(),'v'+metadata.version);
   assert.equal(await release.locator('time').innerText(),metadata.date);
   assert.deepEqual(await release.locator('li').allTextContents(),metadata.changes);
   assert.match(await page.locator('.notes-list').last().innerText(),/自更新方案待定/);
   assert(await page.locator('.version-badge').isVisible());
   await page.getByRole('button',{name:'变量编辑',exact:true}).click();
   await page.locator('.variable-editor').waitFor();
   assert.equal(await page.getByRole('button',{name:'数据更新',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:'确认并执行变量更新',exact:true}).count(),0);
  }
  assert.deepEqual(await page.evaluate(()=>({messages:window.messageData,settings:window.scriptVariables})),before);
  assert.equal(await page.evaluate(()=>window.writes.length),0); assert.deepEqual(errors,[]);
  console.log('PASS retired updater: three navigation entries, no updater route/actions, legacy settings inert, user data untouched, variable editor available at 1200/375');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
