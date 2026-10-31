import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/srujanmirji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4183';
const root=new URL('./',import.meta.url);
const sets={hod:['hod-home','hod-approvals','hod-review','hod-impact','hod-coverage','hod-confirm','hod-success','hod-workload'],ios:['login','home','today','attendance','leave','apply','notifications','profile','hod-approvals','hod-review','hod-coverage','settings']};sets.android=sets.ios;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:375,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
const errors=[],writes=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());if(!r.url().startsWith(base))external.push(r.url());});
const settle=()=>page.evaluate(()=>document.fonts.ready);
const visit=async(platform,id,capture=false)=>{await page.goto(`${base}/experience/${platform}/?screen=${id}${capture?'&capture=1':''}`);await settle();};
const checks=[];
try{
 for(const [platform,ids]of Object.entries(sets)){
  await mkdir(new URL(`${platform}/screenshots/`,root),{recursive:true});
  for(const width of [375,430,1280]){
   await page.setViewportSize({width,height:900});
   for(const id of ids){
    await visit(platform,id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${platform}/${id} overflow ${width}`);
    const bad=await page.locator('#app button:not([disabled]),#app a,#app input:not([type=checkbox]):not([type=file]),#app textarea,#app select').evaluateAll(es=>es.filter(e=>!e.closest('[inert]')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.width<47.9||r.height<47.9)}).map(e=>[e.tagName,e.textContent.trim()]));
    assert.deepEqual(bad,[],`${platform}/${id} targets ${width}`);
    // Walk the actual keyboard order, including browser-focusable scroll regions.
    if(width===375){
     const count=await page.locator('#app a,#app button:not([disabled]),#app input:not([type=file]),#app select,#app textarea').count();
     await page.locator('body').click({position:{x:2,y:2}});
     for(let i=0;i<count+35;i++){
      await page.keyboard.press('Tab');
      const focus=await page.evaluate(()=>{const e=document.activeElement;if(!e?.closest('#app')||e.closest('[inert]'))return null;const s=getComputedStyle(e.closest('.attachment-label')||e);return {tag:e.tagName,id:e.id,type:e.type,classes:e.className,width:parseFloat(s.outlineWidth),style:s.outlineStyle};});
      if(focus)assert(focus.width>=2&&focus.style!=='none',`${platform}/${id} visible focus: ${JSON.stringify(focus)}`);
     }
    }
   }
  }
  const manifest=[];
  await page.setViewportSize({width:390,height:1000});
  for(const id of ids){await visit(platform,id,true);const box=await page.locator('#device').boundingBox();await page.locator('#device').screenshot({path:new URL(`${platform}/screenshots/${id}.png`,root).pathname});manifest.push({id,width:Math.round(box.width),height:Math.round(box.height)});}
  await writeFile(new URL(`${platform}/screenshots/manifest.json`,root),JSON.stringify(manifest,null,2)+'\n');
  checks.push(`${platform}: ${ids.length} screens at 375/430/1280, 48px targets, keyboard focus; @2x exports`);
 }
 await visit('hod','hod-approvals');await page.getByRole('button',{name:'Approved',exact:true}).click();await page.getByRole('heading',{name:'No approved requests'}).waitFor();
 await page.getByRole('button',{name:'Pending',exact:true}).click();await page.getByRole('link',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Approve & Find Cover'}).click();assert(await page.locator('#app').innerText().then(t=>t.includes('Awaiting final approval')));assert.equal(new URL(page.url()).hash,'#hod-review');
 await page.getByRole('button',{name:'Reject',exact:true}).click();await page.getByRole('button',{name:'Reject request',exact:true}).click();await page.getByText('Add a reason before rejecting.').waitFor();
 await page.locator('#rejection-reason').fill('Staffing conflict');await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');assert.equal(await page.locator('#rejection-reason').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Reject',exact:true}).evaluate(e=>e===document.activeElement),true);
 await visit('hod','hod-coverage');assert.equal(await page.locator('.recommendation').nth(1).getByRole('button',{name:'Assign',exact:true}).isDisabled(),true);
 await page.locator('.recommendation').first().getByRole('button',{name:'Assign',exact:true}).click();await page.getByRole('heading',{name:'Assign this class?'}).waitFor();await page.getByRole('button',{name:'Confirm assignment'}).click();await page.getByRole('heading',{name:'Coverage confirmed'}).waitFor();await page.getByRole('button',{name:'Continue to next class'}).click();await page.getByRole('heading',{name:'BCS508',exact:true}).waitFor();
 checks.push('HOD filters, recommendation boundary, rejection validation/trap/Escape, disabled faculty, assignment/confirmation/next-class flow');
 // Stress text is injected only by the check, never persisted in exported designs.
 for(const platform of ['hod','ios','android']){
  await page.setViewportSize({width:375,height:700});await visit(platform,platform==='hod'?'hod-workload':'hod-coverage');
  await page.evaluate(()=>{for(const e of document.querySelectorAll('#app h3'))e.textContent='Prof. Chandrashekhar Venkataraman Subramanya';for(const e of document.querySelectorAll('#app .secondary'))if(e.textContent.includes('CSE'))e.textContent='Department of Artificial Intelligence, Data Science and Computer Engineering';const sizes=[...document.querySelectorAll('#app *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,size] of sizes){e.style.fontSize=(size*2)+'px';e.style.lineHeight='1.5';}});
  assert.equal(await page.locator('.screen-scroll').evaluate(e=>e.scrollWidth>e.clientWidth),false,`${platform} long/scaled text`);
 }
 checks.push('Long faculty/department labels and 200% CSS text stress at 375px; not native font-scaling certification');
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(external,[]);
 const frozen=JSON.parse(await readFile(new URL('handoff/frozen-files.json',root),'utf8'));
 for(const [path,hash]of Object.entries(frozen))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,`Frozen file changed: ${path}`);
 checks.push(`Frozen canonical + faculty files unchanged (${Object.keys(frozen).length} SHA-256 checks); no API writes, external requests or browser exceptions`);
 await writeFile(new URL('handoff/check-results.json',root),JSON.stringify({date:'2026-10-23',status:'passed',checks,notChecked:['Native iOS/Android runtime','VoiceOver/TalkBack','Real device haptics','Native Dynamic Type/font scaling','Native IME/back/safe-area behavior','Dark theme (not designed)']},null,2)+'\n');console.log(checks.join('\n'));
}finally{await browser.close();}
