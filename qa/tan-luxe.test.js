// Tan-Luxe THE FACE self-tan drops added on request (2026-10-14).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
const get=load([2026,9,14]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='add_tan_luxe_the_face_v1');
const isTL=p=>/tan.?luxe/i.test([p.genericName,p.brandName].join(' '));
const prof=seedProfile(get);const TL=prof.products.find(isTL);const type=get('detectType');
const pl=plan(get,prof,60);const pm=Object.keys(pl).filter(k=>k.endsWith(':pm'));

console.log('migration');
t('his library gains exactly one Tan-Luxe, PM weekly, scheduled, self-tan type',()=>{
  assert.strictEqual(prof.products.filter(isTL).length,1);
  assert.strictEqual(TL.session,'pm');assert.strictEqual(TL.frequency,'weekly');assert.strictEqual(TL.scheduled,true);
  assert.strictEqual(type(TL),'selftan');
});
t('its id does not collide with any product or removed product',()=>{
  const ids=prof.products.concat(prof.removedProducts||[]).map(p=>p.id);assert.strictEqual(ids.filter(i=>i===TL.id).length,1);
});
t('idempotent; no-op when Tan-Luxe exists or was removed; safe on empty',()=>{
  const once=M().apply({products:[{id:3,genericName:'x'}]});assert.strictEqual(once.products.length,2);assert.strictEqual(M().apply(once),once);
  const rem={products:[],removedProducts:[{id:9,brandName:'Tan Luxe The Face'}]};assert.strictEqual(M().apply(rem),rem);
  const e=M().apply({});assert.strictEqual(e.products.length,1);assert.strictEqual(e.products[0].id,41);
  const s=M().apply({products:[{id:'anua-v1',genericName:'y'},{id:57,genericName:'z'}]});assert.strictEqual(s.products[2].id,58);
});
t('review: matched, Good, flags fragrance',()=>{
  const r=get('getProductRank')(TL);assert.strictEqual(r.tag,'good');assert.ok(r.cons.some(c=>/fragrance/i.test(c)));
});
console.log('60-day plan');
t('runs about weekly (7-10 nights in 60)',()=>{
  const n=pm.filter(k=>pl[k].some(p=>p.id===TL.id)).length;assert.ok(n>=7&&n<=10,'nights '+n);
});
t('never with a retinoid, acid or vitamin C, and never with the other self-tan',()=>{
  const bad=['retinoid','acid-exfoliant','vitamin-c','benzoyl'];
  pm.forEach(k=>{if(!pl[k].some(p=>p.id===TL.id))return;
    pl[k].forEach(p=>{if(p.id===TL.id)return;assert.notStrictEqual(type(p),'selftan',k);
      assert.ok(!get('conflictGroupsFor')(p).some(g=>bad.includes(g)),`${k}: ${p.genericName}`);});});
});
t('St. Tropez still gets its nights',()=>{
  const st=prof.products.find(p=>/st\. tropez/i.test(p.brandName||''));if(!st||st.scheduled===false)return;
  assert.ok(pm.filter(k=>pl[k].some(p=>p.id===st.id)).length>=6);
});
t('sits with the moisturizer step in the night order',()=>{
  const k=pm.find(k=>pl[k].some(p=>p.id===TL.id));const ids=pl[k].map(p=>p.id);
  const mo=pl[k].findIndex(p=>type(p)==='moisturizer');if(mo<0)return;assert.ok(Math.abs(ids.indexOf(TL.id)-mo)<=2,k+' '+pl[k].map(p=>p.genericName).join(' > '));
});
t('60-day audit has no high issues',()=>{
  const {issues}=require('./audit').audit(get,prof,pl,60);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.msg),[]);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
