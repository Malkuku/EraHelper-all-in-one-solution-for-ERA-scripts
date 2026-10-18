const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/xiaohao/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1200,height:900},acceptDownloads:true});page.setDefaultTimeout(4500);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 const nav=async(name)=>{const select=page.locator('.mobile-navigation select');if(await select.isVisible())await select.selectOption({label:name});else await page.locator('.task-manager').getByRole('navigation',{name:'工作台页面',exact:true}).getByRole('button',{name,exact:true}).click();};
 const save=async()=>{await button('保存配置').click();await page.getByText('配置已保存。',{exact:true}).waitFor();};
 await page.route('https://example.invalid/v1/models',r=>r.fulfill({json:{data:[{id:'alpha'},{id:'beta'}]}}));await page.goto('file:///'+path.join(__dirname,'index.html').replaceAll('\\','/'));await page.waitForFunction(()=>window.ready);
 await page.evaluate(async()=>{const c=window.test.tasks.snapshot();c.tasks=Array.from({length:6},(_,i)=>({...structuredClone(c.tasks[0]),id:'task-'+i,name:['创建次要角色任务','微信主动聊天','商店技能生成','商店道具生成','任务生成','编辑变量'][i]}));c.connections[0].name='配置1（待补全）';c.connections[0].model='REPLACE_WITH_YOUR_MODEL';c.presets[0].name='配置1预设（占位，需要替换）';c.groups[0].taskIds=c.tasks.map(t=>t.id);await window.test.tasks.replaceSettings(c);window.test.ui.darkMode=true;});
 assert.deepEqual((await page.locator('.task-manager .workspace-nav button').allTextContents()).slice(0,2).map(v=>v.trim()),['预设管理','API 配置']);
 assert.equal(await page.locator('.setup-guide,.effective-config,.page-tabs,.save-bar').count(),0,'retired top information/action clusters are absent');
 assert.equal(await page.locator('.task-manager .workspace-nav button').filter({hasText:'规则组'}).count(),1);
 await nav('API 配置');await page.locator('.reference-list summary').waitFor();assert.match(await page.locator('.reference-list summary').innerText(),/6/);assert.equal(await page.locator('.reference-list[open]').count(),0);
 assert.equal(await page.locator('.reference-list .danger,.reference-list .secret-actions').count(),0);
 const metrics=[];
 for(const [width,height] of [[1200,900],[768,600],[375,812],[683,384]]){
  await page.setViewportSize({width,height});await nav('API 配置');await page.locator('.workbench-heading').scrollIntoViewIfNeeded();
  if(width===375){assert(!(await page.locator('.task-manager .workspace-nav').isVisible()));assert(await page.locator('.mobile-navigation select').isVisible());assert(await page.locator('.mobile-resource-select').isVisible());}const measure=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],pageWidth:document.documentElement.scrollWidth,managerWidth:document.querySelector('.task-manager').scrollWidth,managerClient:document.querySelector('.task-manager').clientWidth,save:[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='保存配置').getBoundingClientRect().toJSON(),references:document.querySelector('.reference-list').getBoundingClientRect().toJSON()}));
  assert(measure.pageWidth<=width,JSON.stringify(measure));assert(measure.managerWidth<=measure.managerClient+1,'no workbench horizontal overflow');assert(measure.save.y>=0&&measure.save.bottom<=height,JSON.stringify(measure));
  await page.screenshot({path:path.join(__dirname,`workbench-api-${width}.png`)});metrics.push(measure);
  await page.locator('.reference-list summary').click();assert.equal(await page.locator('.reference-list li').count(),6);if(width===1200){await page.locator('.reference-list').screenshot({path:path.join(__dirname,'workbench-api-six-references.png')});await page.locator('.resource-footer').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'workbench-api-references-actions.png')});}await page.locator('.reference-list summary').click();
 }
 await page.setViewportSize({width:1200,height:900});await nav('API 配置');await page.getByLabel('名称',{exact:true}).fill('跨页 API 草稿');await nav('任务');await nav('API 配置');assert.equal(await page.getByLabel('名称',{exact:true}).inputValue(),'跨页 API 草稿');
 await button('变量编辑').click();await button('任务工作台').click();await nav('API 配置');assert.equal(await page.getByLabel('名称',{exact:true}).inputValue(),'跨页 API 草稿');await page.getByRole('button',{name:'关闭 MVU 助手，草稿保留在当前会话'}).click();await page.evaluate(()=>window.test.ui.showUI=true);await nav('API 配置');assert.equal(await page.getByLabel('名称',{exact:true}).inputValue(),'跨页 API 草稿');await button('获取模型列表').click();await page.getByText('已获取 2 个模型。',{exact:true}).waitFor();await page.getByLabel('可用模型（2 个）').selectOption('beta');await button('删除 API 配置').click();assert.equal(await page.getByRole('dialog',{name:/删除/}).count(),0,'delete is immediate draft editing');await save();
 let snapshot=await page.evaluate(()=>window.test.tasks.snapshot());assert.equal(snapshot.tasks.length,6);assert(snapshot.tasks.every(t=>t.connectionId===''));assert.equal(snapshot.connections.length,0);assert.equal(snapshot.groups[0].taskIds.length,6);
 await page.evaluate(()=>window.test.tasks.load());await nav('任务');assert.equal(await page.locator('.task-row').count(),6);
 await nav('导入与导出');const downloadPromise=page.waitForEvent('download');await button('导出配置').click();const downloaded=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.deepEqual(exported,snapshot);assert(!JSON.stringify(exported).includes('Bearer'));
 await page.locator('label').filter({hasText:/^导入配置/}).locator('input[type=file]').setInputFiles({name:'unfinished.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});const confirm=page.getByRole('dialog',{name:'替换配置草稿',exact:true});await confirm.getByRole('button',{name:'确定',exact:true}).click();if(await button('保存配置').isEnabled())await save();assert.deepEqual(await page.evaluate(()=>window.test.tasks.snapshot()),snapshot);
 await nav('任务');await button('+ 新建任务').click();const editor=page.locator('.task-editor-modal');await editor.waitFor();assert.equal(await editor.getByLabel(/^API 配置/).inputValue(),'');await editor.getByLabel('名称',{exact:true}).fill('');
 const regular=editor.locator('[data-config-key="enabled"]');assert(await regular.isChecked());
 await editor.getByText('触发与高级参数',{exact:true}).click();
 const eventName=editor.getByLabel('附加事件名',{exact:true});await eventName.fill('only:event');
 assert(!(await regular.isChecked()));assert(await regular.isDisabled());assert(await editor.locator('.event-status').isVisible());
 await eventName.fill('');assert(!(await regular.isChecked()));assert(await regular.isEnabled());
 await regular.check();
 await editor.getByRole('button',{name:'结果处理',exact:true}).click();await button('+ 添加写入').click();await editor.getByLabel('目标',{exact:true}).selectOption('event');
 await editor.getByLabel('广播使用的附加事件名',{exact:true}).fill('only:event');
 await editor.getByRole('button',{name:'基础与提示词',exact:true}).click();assert(!(await regular.isChecked()));assert(await regular.isDisabled());
 await button('关闭任务编辑').click();
 const eventRow=page.locator('.task-row.event-task');assert.equal(await eventRow.count(),1);assert(await eventRow.getByRole('checkbox').isDisabled());assert(await eventRow.locator('.event-status').isVisible());
 for(const width of [1200,375]){await page.setViewportSize({width,height:900});assert(await eventRow.locator('.event-status').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:1200,height:900});await save();assert.equal((await page.evaluate(()=>window.test.tasks.snapshot())).tasks.length,7,'empty task saves without creating an API first');
 await nav('API 配置');await button('+ 新建 API').click();assert.equal(await page.getByLabel('API 根地址',{exact:true}).inputValue(),'');assert.equal(await page.getByLabel('模型',{exact:true}).inputValue(),'');await page.getByLabel(/^绑定预设/).selectOption('preset');await save();
 await nav('预设管理');await button('删除预设').click();await save();snapshot=await page.evaluate(()=>window.test.tasks.snapshot());assert.equal(snapshot.presets.length,0);assert.equal(snapshot.connections[0].presetId,null);assert.equal(snapshot.tasks.length,7);await page.evaluate(()=>window.test.tasks.load());
 await nav('规则组');await page.getByLabel('名称',{exact:true}).fill('');await save();await nav('运行结果');assert.equal(await page.locator('.controls-summary').filter({hasText:'未命名规则组'}).count(),1,'blank saved group is still active, with fallback name');
 await nav('API 配置');await page.evaluate(()=>localStorage.setItem('kat.async-tasks.secrets.v1:full-ui-acceptance','{broken'));await page.getByLabel('名称',{exact:true}).fill('损坏密钥也能保存');await save();await page.getByRole('status').filter({hasText:/配置已保存.*密钥清理未完成/}).waitFor();assert.equal(await page.evaluate(()=>window.test.tasks.settings.connections[0].name),'损坏密钥也能保存');await page.evaluate(()=>localStorage.removeItem('kat.async-tasks.secrets.v1:full-ui-acceptance'));await nav('规则组');
 await page.evaluate(async()=>{const c=window.test.tasks.snapshot();c.tasks[0].eventName='group:event';c.tasks[0].enabled=true;await window.test.tasks.replaceSettings(c);});
 assert(await page.locator('.linked-task.event-task .event-status').isVisible());
 assert.equal((await page.evaluate(()=>window.test.tasks.snapshot())).tasks[0].enabled,false);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'workbench-metrics.json'),JSON.stringify(metrics,null,2));console.log('PASS full App: separated navigation/save/action structure, collapsed six references, API/preset free deletion, six consumers retained and bindings cleared, save/reload/export/import, no-API empty task, blank new API and blank active group, cross-tab drafts, four widths/heights');await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});










