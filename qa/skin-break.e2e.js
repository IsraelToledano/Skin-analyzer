// The "Skin feels irritated" button starts a 2-day break; the routine turns
// gentle at once; "End break" undoes it (2026-10-29).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Gentle Exfoliating SA Cleanser','am','daily',{brandName:'Cetaphil'}),P(2,'Gentle Gel Cleanser','pm','daily',{brandName:'Anua'}),
  P(5,'Vitamin C Serum','am','daily',{brandName:"Pura d'or 20%"}),P(6,'water gel moisturizer','both','daily'),P(7,'Sunscreen Serum SPF 50','am','daily'),
  P(4,'Topical Retinoid Cream 0.05%','pm','daily',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)',rotationRole:'none'})];
(async()=>{const server=await serve(8158);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2});
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8158/');await page.waitForSelector('[data-testid=usage-toggle]');
const body=async()=>page.locator('body').innerText();
ok(/Topical Retinoid/.test(await body()),'tonight has the retinoid');
await page.locator('[data-testid=skin-break-start]').last().click();await page.waitForTimeout(250);
ok(await page.locator('[data-testid=skin-break-on]').count()>=1,'the break shows on the routine');
ok(!/Topical Retinoid/.test(await body()),'the retinoid is gone tonight');
await page.screenshot({path:'skin-break.png'});
await page.getByRole('button',{name:'Next day'}).click();await page.waitForTimeout(250);
if(!(await page.getByText('Sunscreen Serum SPF 50').count())){await page.locator('span',{hasText:'Morning Routine'}).first().click();await page.waitForTimeout(200);}
const tm=await body();ok(!/Vitamin C Serum/.test(tm)&&!/Exfoliating SA/.test(tm)&&/Gentle Gel Cleanser/.test(tm),'tomorrow morning is gentle (no vitamin C, no acid wash)');
ok(/Back to normal/.test(tm),'tomorrow still shows the break and when it ends');
await page.getByRole('button',{name:'Previous day'}).click();await page.waitForTimeout(250);
await page.locator('[data-testid=skin-break-end]').last().click();await page.waitForTimeout(250);
ok(/Topical Retinoid/.test(await body())&&await page.locator('[data-testid=skin-break-on]').count()===0,'End break brings the retinoid back');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nskin-break e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
