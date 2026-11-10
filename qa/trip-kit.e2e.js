// A packed trip's day note lists what he took (2026-11-10).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Acne Foaming Wash (10% benzoyl peroxide)','am','daily',{brandName:'PanOxyl Acne Foaming Wash',scheduled:false}),
  P(2,'Niacinamide 10% + Zinc 1%','am','daily',{brandName:'The Ordinary'}),P(3,'Skin Perfecting 2% BHA Liquid Exfoliant','pm','weekly',{brandName:"Paula's Choice"}),
  P(4,'Panthenol Barrier Cream (moisturizer)','pm','daily',{brandName:'Purito Seoul Mighty Bamboo Panthenol Cream'}),P(5,'SPF 50 Sunscreen','am','daily'),
  P(6,'Gel Cleanser','both','daily'),P(7,'Hydrating/Soothing Toner','both','daily')];
const procedures=[{date:'2026-11-04',until:'2026-11-24',type:'trip',kit:[{productId:1,session:'both'},{productId:2,session:'am'},{productId:3,session:'pm'},{productId:4,session:'both'},{productId:5,session:'am'}]}];
(async()=>{const server=await serve(8159);
const b=await chromium.launch({executablePath:require('./chrome'),args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(seed=>{const R=Date;const fx=new R(2026,10,10,8,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},profile({products,procedures,migrations:MIG}));
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8159/');await page.waitForSelector('[data-testid=usage-toggle]');
const note=page.locator('[data-testid=trip-note]');const txt=(await note.count())?await note.innerText():'';
ok(/What you packed/.test(txt),'the trip note says it is what he packed');
ok(/Morning: PanOxyl Acne Foaming, Niacinamide 10% \+ Zinc 1%, Purito Seoul Mighty, SPF 50 Sunscreen/.test(txt),'it lists the morning kit');
ok(/Evening: PanOxyl Acne Foaming, Skin Perfecting 2% BHA Liquid Exfoliant|Evening: PanOxyl Acne Foaming, Paula's Choice/.test(txt),'it lists the evening kit');
ok(!/Tretinoin twice/.test(txt),'no tretinoin line for a kit he packed without it');
const body=await page.locator('body').innerText();
ok(body.includes('Acne Foaming Wash')&&!body.includes('Hydrating/Soothing Toner'),'the morning shows the packed wash, not the toner left at home');
await page.screenshot({path:'trip-kit.png'});
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} failed`:'\nall passed');process.exit(fails?1:0);})();
