// 2026-11-16: opening the app on the trip adds the Light On Serum and the GF
// 15% Solution to the packed mornings, one each morning, taking turns.
const {chromium}=require('playwright-core');const serve=require('./server');const fs=require('fs');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const NEW='trip_kit_add_lighton_gf_v1';const MIG=loadApp().MIGRATIONS.map(m=>m.id).filter(id=>id!==NEW);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
// the phone as it is this morning: the kit without the two serums, the new migration not yet run
const products=[P(1,'Acne Foaming Wash (10% benzoyl peroxide)','am','daily',{brandName:'PanOxyl Acne Foaming Wash',scheduled:false}),
  P(2,'Niacinamide 10% + Zinc 1%','am','daily',{brandName:'The Ordinary'}),P(3,'Skin Perfecting 2% BHA Liquid Exfoliant','pm','twice-weekly',{brandName:"Paula's Choice"}),
  P(4,'Panthenol Barrier Cream (moisturizer)','pm','daily',{brandName:'Purito Seoul Mighty Bamboo Panthenol Cream'}),P(5,'SPF 50 Sunscreen','am','daily'),
  P(6,'Hydrating Serum','pm','daily',{brandName:'The Ordinary Marine Hyaluronics'}),P(7,'Gel Cleanser','both','daily'),P(8,'Hydrating/Soothing Toner','both','daily')];
const procedures=[{date:'2026-11-04',until:'2026-11-24',type:'trip',kit:[{productId:1,session:'both'},{productId:2,session:'am'},{productId:3,session:'pm'},{productId:6,session:'pm'},{productId:4,session:'both'},{productId:5,session:'am'}]}];
const REAL='/mnt/user-data/uploads/99d742f2-skin-ritual-data-2026-11-16-0845.txt';
const run=async(b,port,seed,label,shot)=>{
  const ctx=await b.newContext({viewport:{width:375,height:762},deviceScaleFactor:2});
  await ctx.addInitScript(seed=>{const R=Date;const fx=new R(2026,10,16,8,45).getTime();
    class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
    if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},seed);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:${port}/`);await page.waitForSelector('[data-testid=usage-toggle]');
  const body=async()=>page.locator('body').innerText();
  const txt=await page.locator('[data-testid=trip-note]').innerText();
  ok(/Morning: PanOxyl Acne Foaming, Light On Serum or GF 15% Solution \(alternate mornings\), Niacinamide 10% \+ Zinc 1%, Purito Seoul Mighty/.test(txt),label+': the trip note lists the two as taking turns');
  ok(/Evening: PanOxyl Acne Foaming, Paula's Choice, The Ordinary Marine, Purito Seoul Mighty\./.test(txt),label+': the evening list is unchanged');
  let t=await body();
  ok(t.includes('Vitamin C Derivative Serum')&&!t.includes('Growth Factor Peptide Serum'),label+': today (Nov 16) the morning has the Light On, not the GF 15%');
  ok(t.indexOf('Acne Foaming Wash')<t.indexOf('Vitamin C Derivative Serum')&&t.indexOf('Vitamin C Derivative Serum')<t.lastIndexOf('Niacinamide 10% + Zinc 1%'),label+': wash, then Light On, then niacinamide');
  ok(/0\/5/.test(t),label+': five morning steps');ok(!/shouldn't be used the same session/.test(t),label+': no conflict warning');
  await page.screenshot({path:shot+'.png',fullPage:true});
  await page.locator('[aria-label="Next day"]').click();await page.waitForTimeout(150);t=await body();
  ok(t.includes('Growth Factor Peptide Serum')&&!t.includes('Vitamin C Derivative Serum'),label+': tomorrow (Nov 17) the GF 15%, not the Light On');
  ok(t.lastIndexOf('Niacinamide 10% + Zinc 1%')<t.indexOf('Growth Factor Peptide Serum')&&t.indexOf('Growth Factor Peptide Serum')<t.indexOf('Panthenol Barrier Cream'),label+': niacinamide, then GF 15%, then the cream');
  ok(!/shouldn't be used the same session/.test(t),label+': no conflict warning tomorrow');
  await page.screenshot({path:shot+'-next.png',fullPage:true});
  for(let i=0;i<9;i++){await page.locator('[aria-label="Next day"]').click();await page.waitForTimeout(60);}t=await body();
  ok(!t.includes('Growth Factor Peptide Serum')&&!t.includes('Vitamin C Derivative Serum')&&await page.locator('[data-testid=trip-note]').count()===0,label+': home (Nov 26): neither, and no trip note');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('skinritual_v4')).profile);
  ok(saved.migrations.includes('trip_kit_add_lighton_gf_v1')&&saved.products.filter(p=>/Light On Serum|GF 15%/.test(p.brandName||'')).length===2,label+': saved on the phone — migration recorded, two products added');
  await page.reload();await page.waitForSelector('[data-testid=usage-toggle]');
  const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('skinritual_v4')).profile);
  ok(again.products.length===saved.products.length&&JSON.stringify(again.procedures)===JSON.stringify(saved.procedures),label+': a reload adds nothing twice');
  await page.locator('button',{hasText:'Products'}).first().click();await page.waitForTimeout(300);t=await body();
  ok(t.includes('Light On Serum (Beauty of Joseon)')&&t.includes('GF 15% Solution (The Ordinary)'),label+': both are in the Products tab');
  await page.screenshot({path:shot+'-products.png',fullPage:true});
  ok(errors.length===0,label+': no page errors '+(errors[0]||''));
  await ctx.close();
};
(async()=>{const server=await serve(8163);
const b=await chromium.launch({executablePath:require('./chrome'),args:['--no-sandbox']});
await run(b,8163,profile({products,procedures,migrations:MIG}),'fixture','trip-lighton-gf');
if(fs.existsSync(REAL))await run(b,8163,JSON.parse(fs.readFileSync(REAL,'utf8')).profile,'his real export','trip-lighton-gf-real');
await b.close();server.close();console.log(fails?`\n${fails} failed`:'\nall passed');process.exit(fails?1:0);})();
