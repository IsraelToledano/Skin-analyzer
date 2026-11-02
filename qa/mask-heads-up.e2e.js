// A clay-mask evening shows a heads-up from the morning on, and it goes away
// once the mask is ticked (2026-11-02).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const T0='2026-09-20';
const products=[P(1,'Gel Cleanser','both','daily'),P(5,'water gel moisturizer','both','daily'),P(6,'SPF 50 Sunscreen','am','daily'),
  P(24,'Clay/Pore Cleansing Mask','pm','weekly',{brandName:'Beauty of Joseon Red Bean Refreshing Pore Mask',rotationRole:'none',howTo:'Even layer on clean, dry skin. 5–10 minutes, then massage with warm water and rinse well.'})];
const pins=[{id:1,date:T0,session:'pm',productId:24,bumps:[]}];
(async()=>{const server=await serve(8158);
const b=await chromium.launch({executablePath:require('./chrome'),args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(({seed})=>{const R=Date;const off=new R(2026,8,20,8,15).getTime()-R.now();
  class D extends R{constructor(...a){if(a.length===0)super(R.now()+off);else super(...a)}static now(){return R.now()+off}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,pins,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8158/');await page.waitForSelector('[data-testid=usage-toggle]');
const note=page.locator('[data-testid=mask-heads-up]');
ok(await note.count()===1,'the morning shows the clay-mask heads-up');
const txt=(await note.count())?await note.innerText():'';
ok(/Clay mask tonight/.test(txt)&&/Clay\/Pore Cleansing Mask/.test(txt),'it names the mask and says tonight');
ok(/5–10 minutes/.test(txt),'it gives the mask\'s own time');ok(/early/.test(txt),'it suggests doing the evening early');
const box=await note.boundingBox(),am=await page.locator('text=Morning Routine').first().boundingBox();ok(box&&am&&box.y<am.y,'it sits above the morning routine');
await page.screenshot({path:'mask-heads-up.png'});
const row=name=>page.locator('div[style*="flex-wrap"]',{has:page.locator(`span:has-text("${name}")`)}).last();
if(!(await page.getByText('Clay/Pore Cleansing Mask').count())||!(await row('Clay/Pore Cleansing Mask').isVisible())){await page.locator('span',{hasText:'Evening Routine'}).first().click();await page.waitForTimeout(300);}
await row('Clay/Pore Cleansing Mask').locator('span',{hasText:'Clay/Pore Cleansing Mask'}).first().click();await page.waitForTimeout(300);
ok(await note.count()===0,'ticking the mask done removes the heads-up');
await page.locator('[aria-label="Next day"]').click();await page.waitForTimeout(150);
ok(await note.count()===0,'no heads-up on a day without a clay mask');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} failed`:'\nall passed');process.exit(fails?1:0);})();
