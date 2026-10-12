// Finished products leave the library but stay in history (2026-10-12: Caudalie Purifying Toner).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');const fs=require('fs');
const get=load([2026,9,12]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='finish_caudalie_purifying_toner_v1');
const toner={id:7,genericName:'Purifying Toner',brandName:'Caudalie Vinopure Purifying Toner',session:'am',frequency:'daily',scheduled:true};
const gel={id:29,genericName:'Purifying Gel Cleanser',brandName:'Caudalie Vinopure Purifying Gel Cleanser (Paris)'};
t('removes only the purifying toner and keeps it in history',()=>{
  const out=M().apply({products:[toner,gel],removedProducts:[{id:13}]});
  assert.deepStrictEqual(out.products.map(p=>p.id),[29]);assert.strictEqual(out.removedProducts[0].id,7);assert.ok(out.removedProducts[0].removedAt);assert.strictEqual(out.removedProducts[1].id,13);
});
t('idempotent and safe on empty/malformed profiles',()=>{
  const once=M().apply({products:[toner]});assert.strictEqual(M().apply(once),once);
  const e={};assert.strictEqual(M().apply(e),e);
});
t('his library: every morning keeps cleanser, moisturizer and sunscreen, and the 30-day plan passes the audit',()=>{
  const prof=seedProfile(get);assert.ok(!prof.products.some(p=>p.id===7));
  const pl=plan(get,prof,30);const am=Object.keys(pl).filter(k=>k.endsWith(':am'));
  am.forEach(k=>['cleanser','moisturizer','spf'].forEach(t=>assert.ok(pl[k].some(p=>get('detectType')(p)===t),`${k} missing ${t}`)));
  const {issues}=require('./audit').audit(get,prof,pl,30);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.msg),[]);
});
t('logs that mention the toner still resolve through history',()=>{
  const out=M().apply({products:[toner],logs:[{date:'2026-10-09',session:'am',productId:7,done:true}]});
  assert.strictEqual(out.logs.length,1);assert.ok(out.removedProducts.some(p=>p.id===7));
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
