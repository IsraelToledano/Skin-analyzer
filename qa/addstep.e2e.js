const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
(async()=>{const server=await serve(8143);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2});
const products=[P(1,'Gel Cleanser','pm','daily'),P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),
  P(4,'Topical Retinoid Cream 0.05%','pm','daily',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)',rotationRole:'none'}),
  P(5,'water gel moisturizer','pm','daily'),
  P(23,'Clay Face Mask / Bentonite Clay Mask','pm','weekly',{brandName:'Aztec Secret Indian Healing Clay',scheduled:false,nextDate:''})];
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8143/');await page.waitForSelector('[data-testid=usage-toggle]');
const names=async()=>page.evaluate(()=>[...document.querySelectorAll('[data-testid=usage-toggle]')].map(b=>b.closest('div[style*="flex-wrap"]').querySelector('span[style*="font-weight: 600"]').innerText.replace(/^\d+\.\s*/,'').split(' · ')[0].trim()));
const before=await names();console.log('   before:',before.join(' → '));
ok(before.some(n=>/Retinoid/.test(n)),'tretinoin is on tonight');
await page.getByText('+ Add step').first().click();
await page.waitForSelector('[data-testid=picker-row]');
await page.locator('[data-testid=picker-row]',{hasText:'Clay Face Mask'}).click();
await page.waitForSelector('[data-testid=add-notice]');
const notice=(await page.locator('[data-testid=add-notice]').innerText()).replace(/\s+/g,' ');
console.log('   notice:',notice);
ok(/Added Clay Face Mask/.test(notice),'notice confirms the added step');
ok(/Topical Retinoid Cream 0\.05%.*shouldn't be used the same session/.test(notice),'notice says the tretinoin was removed and why');
await page.waitForTimeout(200);
const after=await names();console.log('   after: ',after.join(' → '));
ok(after[1]&&/Clay Face Mask/.test(after[1]),'clay mask lands right after the cleanser');
const retRow=page.locator('div[style*="flex-wrap"]',{has:page.locator('span:has-text("Topical Retinoid")')}).last();
const retTxt=await retRow.count()?await retRow.innerText():'';
ok(!retTxt||/Skipped|skipped/.test(retTxt),'tretinoin is no longer an active step tonight');
await page.screenshot({path:'addstep.png'});
// Update routine reports the change
await page.locator('[data-testid=update-routine]').click();
const rep=(await page.locator('[data-testid=update-report]').innerText()).replace(/\s+/g,' ');
ok(/Clay Face Mask/.test(rep),'Update routine report lists the added step');
await page.reload();await page.waitForSelector('[data-testid=usage-toggle]');
const persisted=await names();ok(persisted.some(n=>/Clay Face Mask/.test(n)),'survives a reload');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nadd-step e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
