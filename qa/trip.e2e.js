// A trip day shows what the trip routine is (2026-11-01); a product coming
// back on a date shows when, in the Products tab.
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Gel Cleanser','both','daily'),P(2,'water gel moisturizer','both','daily'),P(3,'SPF 50 Sunscreen','am','daily'),
  P(4,'Topical Retinoid Cream 0.05%','pm','three-weekly',{brandName:'Ret-Avit (Tretinoin 0.05%)'}),
  P(5,'Glycolic Acid 7% Toning Solution','pm','weekly',{brandName:'The Ordinary',activeFrom:'2026-11-25'})];
const procedures=[{date:'2026-11-04',until:'2026-11-24',type:'trip',noRetinoid:['2026-11-15','2026-11-16','2026-11-17','2026-11-18']}];
(async()=>{const server=await serve(8157);
const b=await chromium.launch({executablePath:require('./chrome'),args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(seed=>{const R=Date;const fx=new R(2026,10,10,8,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},profile({products,procedures,migrations:MIG}));
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8157/');await page.waitForSelector('[data-testid=usage-toggle]');
const note=page.locator('[data-testid=trip-note]');
ok(await note.count()===1,'a trip day shows the trip note');
const txt=(await note.count())?await note.innerText():'';
ok(/until Nov 24/.test(txt),'it says until when');ok(/Nov 15–Nov 18 \(dives\)/.test(txt),'it names the no-retinoid dive nights');ok(/sunscreen/i.test(txt),'it mentions sunscreen');
await page.screenshot({path:'trip.png'});
for(let i=0;i<7;i++){await page.locator('[aria-label="Previous day"]').click();await page.waitForTimeout(60);}
ok(await note.count()===0,'no trip note on a day at home (Nov 3)');
await page.locator('button',{hasText:'Products'}).first().click();await page.waitForTimeout(300);
const chip=page.locator('[data-testid=active-from]');
const chipTxt=await chip.allInnerTexts();ok(chipTxt.length>=1&&chipTxt.every(x=>x.trim()==='Back Nov 25'),'the returning acid shows "Back Nov 25" '+JSON.stringify(chipTxt));
await page.screenshot({path:'trip-products.png'});
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} failed`:'\nall passed');process.exit(fails?1:0);})();
