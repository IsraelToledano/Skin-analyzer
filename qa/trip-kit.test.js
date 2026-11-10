// 2026-11-10: the trip routine is what he packed (PanOxyl Acne Foaming Wash,
// niacinamide, salicylic acid, Purito bamboo panthenol cream, sunscreen);
// at home: salicylic first on acid nights, more hydration (Ginseng essence
// every morning, bamboo cream every evening, VinoHydra 3×/week).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,10]);const type=get('detectType'),rr=get('rotationRoleFor'),add=get('addDaysStr'),ag=get('classifyActiveGroups');
const prof=seedProfile(get);const pl=plan(get,prof,70);
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const PAN=by(/PanOxyl/),CREAM=by(/Bamboo Panthenol/),NIA=by(/Niacinamide 10%/),BHA=by(/2% BHA Liquid/),SPF=prof.products.find(p=>p.scheduled&&type(p)==='spf');
const GIN=by(/Ginseng Essence/),SNAIL=by(/Snail/),MARINE=by(/Marine Hyaluronic/),RED=by(/Red Bean Water Gel/),VINO=by(/VinoHydra/);
const keys=s=>Object.keys(pl).filter(k=>k.endsWith(':'+s)).sort();
const trip=k=>{const d=k.split(':')[0];return d>='2026-11-10'&&d<='2026-11-24';},home=k=>k.split(':')[0]>='2026-11-25';
const M=id=>get('MIGRATIONS').find(m=>m.id===id);
const ids=l=>l.map(p=>p.id);

console.log('library');
t('PanOxyl Acne Foaming Wash joins the library: a benzoyl peroxide cleanser, not in the home routine, with a bleach warning',()=>{
  assert.ok(PAN);assert.strictEqual(type(PAN),'cleanser');assert.ok(ag(PAN).includes('benzoyl'));assert.strictEqual(PAN.scheduled,false);assert.ok(/bleaches fabric/.test(PAN.howTo));});
t('the Purito bamboo panthenol cream joins as the evening moisturizer',()=>{assert.ok(CREAM);assert.strictEqual(type(CREAM),'moisturizer');assert.ok(CREAM.scheduled);assert.strictEqual(CREAM.session,'pm');});
t('the trip carries the kit: wash and cream both, niacinamide and sunscreen mornings, BHA evenings',()=>{
  const tr=prof.procedures.find(x=>x.type==='trip');assert.deepStrictEqual(tr.kit,[{productId:PAN.id,session:'both'},{productId:NIA.id,session:'am'},{productId:BHA.id,session:'pm'},{productId:CREAM.id,session:'both'},{productId:SPF.id,session:'am'}]);});
t('home: BHA up to twice a week, Ginseng to mornings, Marine stays evenings, VinoHydra 3×/week, Red Bean gel mornings only',()=>{
  assert.strictEqual(BHA.frequency,'twice-weekly');assert.strictEqual(GIN.session,'am');assert.strictEqual(MARINE.session,'pm');assert.strictEqual(VINO.frequency,'three-weekly');assert.strictEqual(RED.session,'am');});
t('migrations: idempotent, safe on empty, no duplicate products',()=>{
  ['trip_kit_2026_11_v1','more_salicylic_more_hydration_v1'].forEach(id=>{assert.strictEqual(M(id).apply(prof),prof,id);const e={};assert.strictEqual(M(id).apply(e),e,id);});
  assert.strictEqual(prof.products.filter(p=>/panoxyl/i.test(p.brandName||'')).length,1);assert.strictEqual(prof.products.filter(p=>/bamboo/i.test(p.brandName||'')).length,1);
  const all=prof.products.concat(prof.removedProducts||[]).map(p=>p.id);assert.strictEqual(new Set(all).size,all.length,'id collision');});
t('a PanOxyl or bamboo cream already in the library is reused, not duplicated',()=>{
  const base={products:[{id:50,brandName:'PanOxyl Acne Foaming Wash',genericName:'wash'},{id:51,brandName:'Purito Seoul Mighty Bamboo Panthenol Cream',genericName:'cream'}],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24'}]};
  const out=M('trip_kit_2026_11_v1').apply(base);assert.strictEqual(out.products.length,2);assert.ok(out.procedures[0].kit.some(k=>k.productId===50)&&out.procedures[0].kit.some(k=>k.productId===51));});
t('before Nov 10 and after the trip the kit migration does nothing; the home one only from Nov 10',()=>{
  const base={products:[{id:1,brandName:'Paula\'s Choice',genericName:'Skin Perfecting 2% BHA Liquid Exfoliant',frequency:'weekly'}],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24'}]};
  [[2026,10,9],[2026,10,25]].forEach(d=>{const g=load(d);assert.strictEqual(g('MIGRATIONS').find(m=>m.id==='trip_kit_2026_11_v1').apply(base),base,d.join('-'));});
  assert.strictEqual(load([2026,10,9])('MIGRATIONS').find(m=>m.id==='more_salicylic_more_hydration_v1').apply(base),base);});

console.log('the trip (what he packed)');
const AM=[PAN,NIA,CREAM,SPF].map(p=>p.id).sort(),PM=[PAN,BHA,CREAM].map(p=>p.id).sort();
t('every trip morning is exactly: PanOxyl, niacinamide, cream, sunscreen',()=>keys('am').filter(trip).forEach(k=>assert.deepStrictEqual(ids(pl[k]).sort(),AM,k)));
t('every trip evening is exactly: PanOxyl, salicylic acid, cream',()=>keys('pm').filter(trip).forEach(k=>assert.deepStrictEqual(ids(pl[k]).sort(),PM,k)));
t('in order: wash first, sunscreen last; BHA before the cream',()=>{keys('am').filter(trip).forEach(k=>{assert.strictEqual(pl[k][0].id,PAN.id,k);assert.strictEqual(pl[k][pl[k].length-1].id,SPF.id,k);});
  keys('pm').filter(trip).forEach(k=>{const i=ids(pl[k]);assert.strictEqual(i[0],PAN.id,k);assert.ok(i.indexOf(BHA.id)<i.indexOf(CREAM.id),k);});});
const R=(p,d,s)=>get('addStepIrritationRisks')(prof,p,d,s).map(r=>r.text).join(' | ');
t('the packed routine never sets off a warning (PanOxyl the morning after the BHA included)',()=>keys('am').concat(keys('pm')).filter(trip).forEach(k=>{const [d,s]=k.split(':');pl[k].forEach(p=>assert.strictEqual(R(p,d,s),'',`${k} ${p.genericName}`));}));
t('an acid he didn\'t pack still warns on the trip (sun)',()=>assert.ok(/strong sun/.test(R(by(/Glycolic Acid 7%/),'2026-11-12','pm'))));
t('the trip note lists what he packed, by session',()=>{const txt=get('tripKitText')(prof.procedures.find(x=>x.type==='trip'),prof.products);
  assert.ok(/Morning: PanOxyl Acne Foaming, Niacinamide 10% \+ Zinc 1%, Purito Seoul Mighty, SKIN1004 Madagascar Centella\./.test(txt),txt);assert.ok(/Evening: PanOxyl Acne Foaming, Paula's Choice, Purito Seoul Mighty\./.test(txt),txt);
  assert.strictEqual(get('tripKitText')({type:'trip'},prof.products),null);});

console.log('home (from Nov 25)');
const exN=keys('pm').filter(home).filter(k=>pl[k].some(p=>rr(p)==='exfoliant'));const sal=get('isSalicylicLeaveOn');
t('salicylic on most acid nights (3 of 4 or more)',()=>{const s=exN.filter(k=>pl[k].some(p=>rr(p)==='exfoliant'&&sal(p))).length;assert.ok(s>=exN.length*0.7,`${s}/${exN.length}`);});
t('the other acids get one night every two weeks, never closer',()=>{const o=exN.filter(k=>pl[k].some(p=>rr(p)==='exfoliant'&&!sal(p))).map(k=>k.split(':')[0]);
  assert.ok(o.length>=2,o.join(' '));for(let i=1;i<o.length;i++){const g=get('daysBetween')(o[i-1],o[i]);assert.ok(g>=14&&g<=16,`${o[i-1]}->${o[i]}`);}assert.ok(get('daysBetween')('2026-11-25',o[0])>=14,'first other '+o[0]);});
t('no acid on the first night home, right after the last trip night\'s BHA',()=>{assert.ok(!pl['2026-11-25:pm'].some(p=>ag(p).includes('acid-exfoliant')&&!get('isRinseOffProduct')(p)),pl['2026-11-25:pm'].map(p=>p.genericName).join(', '));
  assert.strictEqual(R(BHA,'2026-11-25','pm')!=='',true);});
t('two exfoliant nights a week still (from the first full week home)',()=>{for(let w='2026-12-02';add(w,6)<='2027-01-18';w=add(w,7))assert.strictEqual(exN.filter(k=>{const d=k.split(':')[0];return d>=w&&d<=add(w,6);}).length,2,w);});
t('Ginseng essence every morning, never in the evening',()=>{const am=keys('am').filter(home);assert.ok(am.filter(k=>ids(pl[k]).includes(GIN.id)).length>=am.length*0.95);keys('pm').filter(home).forEach(k=>assert.ok(!ids(pl[k]).includes(GIN.id),k));});
t('bamboo cream every evening, Red Bean gel every morning (and never the other way round)',()=>{keys('pm').filter(home).forEach(k=>{assert.ok(ids(pl[k]).includes(CREAM.id),k);assert.ok(!ids(pl[k]).includes(RED.id),k);});keys('am').filter(home).forEach(k=>{assert.ok(ids(pl[k]).includes(RED.id),k);assert.ok(!ids(pl[k]).includes(CREAM.id),k);});});
t('snail essence and Marine Hyaluronics share the evenings evenly',()=>{const c=[SNAIL,MARINE].map(p=>keys('pm').filter(home).filter(k=>ids(pl[k]).includes(p.id)).length);assert.ok(Math.min(...c)>=6&&Math.abs(c[0]-c[1])<=3,c.join('/'));});
t('VinoHydra about 3 times a week',()=>{const n=keys('pm').filter(home).filter(k=>ids(pl[k]).includes(VINO.id)).length,w=keys('pm').filter(home).length/7;assert.ok(n/w>=2.5&&n/w<=3.2,(n/w).toFixed(2));});
t('sunscreen every morning and never pushes a skincare step out (cap excludes it)',()=>keys('am').filter(home).forEach(k=>{assert.ok(ids(pl[k]).includes(SPF.id),k);assert.ok(pl[k].filter(get('countsTowardCap')).length<=get('SESSION_CAP'),k);}));
t('70-day plan: routine audit (trip-kit rules included) finds no high issues',()=>{const {issues}=require('./audit').audit(get,prof,pl,70);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.key+' '+i.msg),[]);});

console.log('generic');
t('salicylic leave-on: BHA and Vinopure yes; AHA mixes, peels, Microfoliant and an SA wash no',()=>{
  [/2% BHA Liquid/,/Vinopure Blemish/].forEach(re=>assert.ok(sal(by(re)),String(re)));
  [/30 Days Miracle/,/COSRX AHA\/BHA/,/AHA 30%/,/Microfoliant/,/Gentle Exfoliating SA/,/One Step Peel/,/Glycolic Acid 7%/].forEach(re=>assert.ok(!sal(by(re)),String(re)));assert.ok(!sal(null));});
t('a kit entry for a product that isn\'t in the library is ignored',()=>{const p2={...prof,procedures:prof.procedures.map(x=>x.type==='trip'?{...x,kit:[...x.kit,{productId:'nope',session:'both'}]}:x)};
  const pl2=plan(get,p2,5);Object.keys(pl2).filter(trip).forEach(k=>assert.ok(pl2[k].length>=3,k));});
t('winterFull without a "rotation" start date counts the two weeks from the first salicylic-first night',()=>{
  assert.strictEqual(get('rotationStartOn')([],'2026-12-01'),null);assert.strictEqual(get('rotationStartOn')([{type:'rotation',date:'2026-11-25',plan:'winterFull'}],'2026-12-01'),'2026-11-25');});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
