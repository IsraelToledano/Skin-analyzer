// Expanding a step shows its wait note; the Ask Claude button shows an AI
// sparkle, not a bug (2026-10-16).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const NOTE='Wait 1-2 minutes after the toner.';
const products=[P(1,'Gel Cleanser','am','daily'),P(5,'Vitamin C Serum','am','daily',{brandName:"Pura d'or 20%",waitInstruction:NOTE}),
  P(6,'water gel moisturizer','am','daily',{waitInstruction:'   '}),P(7,'SPF 50 Sunscreen','am','daily')];
(async()=>{const server=await serve(8152);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(seed=>{const R=Date;const fx=new R(2026,8,20,8,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},profile({products,migrations:MIG}));
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8152/');await page.waitForSelector('[data-testid=usage-toggle]');
const cards=page.locator('[data-testid=usage-toggle]');
const idx=async name=>page.evaluate(n=>[...document.querySelectorAll('[data-testid=usage-toggle]')].findIndex(b=>b.closest('div[style*="flex-wrap"]').innerText.includes(n)),name);
ok((await page.locator('[data-testid=wait-note]').count())===0,'no note shown while collapsed');
await cards.nth(await idx('Vitamin C')).click();await page.waitForSelector('[data-testid=wait-note]');
ok((await page.locator('[data-testid=wait-note]').innerText()).includes(NOTE),'expanding the vitamin C shows its wait note');
const panel=page.locator('[data-testid=usage-panel]');
ok((await panel.innerText()).indexOf(NOTE)<(await panel.innerText()).indexOf('Last used'),'the note comes first in the panel');
await page.screenshot({path:'wait-note.png'});
await cards.nth(await idx('Vitamin C')).click();
await cards.nth(await idx('water gel')).click();await page.waitForSelector('[data-testid=usage-panel]');
ok((await page.locator('[data-testid=wait-note]').count())===0,'a blank note shows nothing');
const btn=page.locator('[data-testid=report-button]');
ok((await btn.locator('[data-testid=ai-icon]').count())===1,'the Ask Claude button shows the AI sparkle');
ok(!(await btn.innerText()).includes('🐞'),'no bug icon');
ok((await btn.getAttribute('aria-label'))==='Ask Claude','labelled Ask Claude');
const bb=await btn.boundingBox();ok(bb&&bb.width<=40&&bb.height<=40,'button keeps its small round size');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} failed`:'\nall passed');process.exit(fails?1:0);})();
