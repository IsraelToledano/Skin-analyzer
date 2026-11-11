// 2026-11-11: he packed the Marine Hyaluronics too (trip evenings); the
// Pura d'or vitamin C ran out — the Trader Joe's Vitamin C Serum takes its
// slot.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,11]);const type=get('detectType'),ag=get('classifyActiveGroups'),add=get('addDaysStr');
const prof=seedProfile(get);const pl=plan(get,prof,70);
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const MARINE=by(/Marine Hyaluronic/),BHA=by(/2% BHA Liquid/),CREAM=by(/Bamboo Panthenol/),TJ=by(/Trader Joe's Vitamin C/);
const keys=s=>Object.keys(pl).filter(k=>k.endsWith(':'+s)).sort();
const trip=k=>{const d=k.split(':')[0];return d>='2026-11-11'&&d<='2026-11-24';},home=k=>k.split(':')[0]>='2026-11-25';
const M=id=>get('MIGRATIONS').find(m=>m.id===id);const ids=l=>l.map(p=>p.id);

console.log('trip: the Marine');
t('the kit gains the Marine for the evenings',()=>{const k=prof.procedures.find(x=>x.type==='trip').kit;assert.ok(k.some(x=>x.productId===MARINE.id&&x.session==='pm'));assert.strictEqual(k.length,6);});
t('every trip evening: wash, BHA, Marine, cream — in that order',()=>keys('pm').filter(trip).forEach(k=>{const i=ids(pl[k]);assert.ok(i.includes(MARINE.id),k);assert.ok(i.indexOf(BHA.id)<i.indexOf(MARINE.id)&&i.indexOf(MARINE.id)<i.indexOf(CREAM.id),k+' '+pl[k].map(p=>p.genericName).join(' > '));}));
t('never in a trip morning (no product runs evening and then the next morning)',()=>keys('am').filter(trip).forEach(k=>assert.ok(!ids(pl[k]).includes(MARINE.id),k)));
t('no warning on it',()=>keys('pm').filter(trip).forEach(k=>assert.strictEqual(get('addStepIrritationRisks')(prof,MARINE,k.split(':')[0],'pm').length,0,k)));
t('idempotent; no-op without a kit, without the Marine, or after the trip',()=>{const m=M('trip_kit_add_marine_v1');assert.strictEqual(m.apply(prof),prof);const e={};assert.strictEqual(m.apply(e),e);
  const nokit={products:[{id:18,brandName:'The Ordinary Marine Hyaluronics'}],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24'}]};assert.strictEqual(m.apply(nokit),nokit);
  const late=load([2026,10,25])('MIGRATIONS').find(x=>x.id==='trip_kit_add_marine_v1');const k={products:[{id:18,brandName:'The Ordinary Marine Hyaluronics'}],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24',kit:[]}]};assert.strictEqual(late.apply(k),k);});

console.log('vitamin C');
t('the Pura d\'or is gone from the product list and sits in Recently deleted, marked finished',()=>{assert.ok(!prof.products.some(p=>/pura d.or/i.test(p.brandName||'')));
  const r=(prof.removedProducts||[]).find(p=>/pura d.or/i.test(p.brandName||''));assert.ok(r);assert.ok(r.removedAt&&/Finished/.test(r.notes));});
t('the Trader Joe\'s Vitamin C Serum takes its slot: mornings, twice a week, with its instructions',()=>{assert.ok(TJ);assert.ok(TJ.scheduled);assert.strictEqual(TJ.session,'am');assert.strictEqual(TJ.frequency,'twice-weekly');
  assert.ok(ag(TJ).includes('vitamin-c'));assert.ok(TJ.howTo&&TJ.waitInstruction);assert.strictEqual(get('getProductRank')(TJ).tag,'best');});
t('home: it runs about weekly or more, only on mornings after a gentle evening; the Pura d\'or never',()=>{
  const am=keys('am').filter(home);const n=am.filter(k=>ids(pl[k]).includes(TJ.id));assert.ok(n.length>=am.length/7,`${n.length} in ${am.length}`);
  n.forEach(k=>{const prev=add(k.split(':')[0],-1)+':pm';assert.ok(!(pl[prev]||[]).some(p=>!['cleanser','cleanser_oil'].includes(type(p))&&ag(p).some(g=>g==='retinoid'||g==='acid-exfoliant')),k);});
  Object.values(pl).forEach(l=>assert.ok(!l.some(p=>/pura d.or/i.test(p.brandName||''))));});
t('not on the trip (it stayed home)',()=>keys('am').filter(trip).forEach(k=>assert.ok(!ids(pl[k]).includes(TJ.id),k)));
t('idempotent; safe on empty; a Trader Joe\'s already in the library is reused; before Nov 11 nothing changes',()=>{const m=M('vitc_puradour_to_traderjoes_v1');assert.strictEqual(m.apply(prof),prof);
  const e=m.apply({});assert.strictEqual(e.products.length,1);assert.strictEqual(m.apply(e),e);
  const has={products:[{id:5,brandName:"Pura d'or 20% Vitamin C Serum",genericName:'Vitamin C Serum',session:'am',frequency:'twice-weekly',scheduled:true},{id:'x',brandName:"Trader Joe's Vitamin C Serum",genericName:'Vitamin C Serum'}]};
  const o=m.apply(has);assert.strictEqual(o.products.length,1);assert.strictEqual(o.products[0].id,'x');
  const early=load([2026,10,10])('MIGRATIONS').find(x=>x.id==='vitc_puradour_to_traderjoes_v1');assert.strictEqual(early.apply(has),has);});
t('70-day plan: the routine audit finds no high issues',()=>{const {issues}=require('./audit').audit(get,prof,pl,70);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.key+' '+i.msg),[]);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
