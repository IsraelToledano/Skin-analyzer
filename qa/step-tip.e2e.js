// Ticking a step shows what to do before the next one: closes itself after
// 5 s, a tap keeps it open, ✕ closes it (2026-10-26).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Gel Cleanser','pm','daily'),
  P(4,'Topical Retinoid Cream 0.05%','pm','daily',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)',rotationRole:'none'}),
  P(5,'water gel moisturizer','pm','daily'),P(16,'overnight lip sleeping mask','pm','daily')];
(async()=>{const server=await serve(8155);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(({seed})=>{const R=Date;const off=new R(2026,8,20,20,30).getTime()-R.now();
  // a fixed evening that still ticks forward, so timers behave
  class D extends R{constructor(...a){if(a.length===0)super(R.now()+off);else super(...a)}static now(){return R.now()+off}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8155/');await page.waitForSelector('[data-testid=usage-toggle]');
const row=name=>page.locator('div[style*="flex-wrap"]',{has:page.locator(`span:has-text("${name}")`)}).last();
const tick=async name=>{await row(name).locator('span',{hasText:name}).first().click();await page.waitForTimeout(150);};
const toast=page.locator('[data-testid=step-tip]');
// 1. tick the cleanser → tip for the retinoid
await tick('Gel Cleanser');
ok(await toast.count()===1,'ticking the cleanser shows a tip');
const txt=(await toast.innerText()).replace(/\s+/g,' ');console.log('   tip:',txt);
ok(/Before Topical Retinoid/.test(txt)&&/completely dry/.test(txt),'it says to wait until skin is completely dry before the retinoid');
await page.screenshot({path:'step-tip.png'});
// 2. closes itself after 5 s
await page.waitForTimeout(5600);ok(await toast.count()===0,'it closes by itself after 5 seconds');
// 3. tap keeps it; ✕ closes
await tick('Topical Retinoid');ok(await toast.count()===1&&/Before water gel moisturizer/.test(await toast.innerText()),'ticking the retinoid shows the moisturizer tip');
await toast.click();ok((await toast.getAttribute('data-kept'))==='1','a tap keeps it open');
await page.waitForTimeout(6000);ok(await toast.count()===1,'still open after 6 seconds');
await page.locator('[data-testid=step-tip-close]').click();await page.waitForTimeout(150);ok(await toast.count()===0,'✕ closes it');
// 4. ✕ also closes it before the 5 seconds are up
await tick('Topical Retinoid');await tick('Topical Retinoid');ok(await toast.count()===1,'re-ticking shows it again');
await page.waitForTimeout(1000);await page.locator('[data-testid=step-tip-close]').click();await page.waitForTimeout(150);ok(await toast.count()===0,'✕ closes it right away');
// 5. no tip when there is nothing to say (moisturizer → lip), or when unticking
await tick('water gel moisturizer');ok(await toast.count()===0,'no tip when the next step needs nothing (moisturizer → lip)');
await tick('water gel moisturizer');ok(await toast.count()===0,'unticking shows nothing');
// 6. a skipped next step is passed over
await tick('Gel Cleanser');await page.locator('[data-testid=step-tip-close]').click().catch(()=>{});
await row('Topical Retinoid').getByRole('button',{name:'Skip',exact:true}).click();await page.waitForTimeout(150);
await tick('Gel Cleanser');await tick('Gel Cleanser');
ok(await toast.count()===0,'with the retinoid skipped, the cleanser tip goes to the moisturizer (nothing to say)');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nstep-tip e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
