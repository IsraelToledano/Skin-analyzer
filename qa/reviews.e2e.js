const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
(async()=>{const server=await serve(8142);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2});
const products=[P(1,'Gel Cleanser','pm','daily'),
  P(23,'Clay Face Mask / Bentonite Clay Mask','pm','daily',{brandName:'Aztec Secret Indian Healing Clay',rotationRole:'none'}),
  P(5,'water gel moisturizer','pm','daily',{brandName:'Beauty of Joseon Red Bean Water Gel'}),
  P(21,'Sunscreen Serum SPF 50+ PA++++','pm','daily',{brandName:'SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum'})];
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8142/');await page.waitForSelector('[data-testid=usage-toggle]');
const card=page.locator('div[style*="flex-wrap"]',{has:page.locator('span:has-text("Clay Face Mask")')}).last();
await card.locator('[data-testid=usage-toggle]').click();
const cmp=page.locator('[data-testid=usage-panel] [data-testid=alt-comparison]').first();
await cmp.waitFor();
const txt=(await cmp.innerText()).replace(/\s+/g,' ');
console.log('   panel:',txt.slice(0,260)+'…');
ok(/This one/.test(txt)&&/Caudalie Masque Instant Détox/.test(txt),'shows "This one" vs the alternative');
ok(/Why it's better:/.test(txt),'shows the reason');
ok(!/already/i.test(txt),'no "already in your routine" reasoning');
ok(/You own it/.test(txt),'an owned alternative says it costs nothing extra');
const panel=(await page.locator('[data-testid=usage-panel]').first().innerText());
ok(!/if reactivated|unscheduled list/i.test(panel),'no stale "unscheduled / reactivated" wording');
await cmp.scrollIntoViewIfNeeded();await page.screenshot({path:'review-panel.png'});
// detail modal from the rank badge
await card.locator('span[title="Tap for why"]').click();
await page.waitForTimeout(250);
const modalCmp=await page.locator('[data-testid=alt-comparison]').count();
ok(modalCmp>=2,'detail window also shows the head-to-head');
ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=390,'no sideways scroll');
// a market upgrade shows its price and where to buy it, in the daily view
await page.goto('http://localhost:8142/?r=1');await page.waitForSelector('[data-testid=usage-toggle]');
const sun=page.locator('div[style*="flex-wrap"]',{has:page.locator('span:has-text("Sunscreen Serum")')}).last();
if(await sun.count()){await sun.locator('[data-testid=usage-toggle]').click();
  const price=await page.locator('[data-testid=usage-panel] [data-testid=alt-price]').first().innerText().catch(()=>'');
  console.log('   price line:',price);
  ok(/\$37/.test(price)&&/yours/.test(price)&&/Super-Pharm/.test(price),'the better pick shows its price, yours, and where to buy');
}else ok(false,'sun serum row not shown');
ok(errors.length===0,'no page errors '+(errors.length?errors[0]:''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nreview e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
