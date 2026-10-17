// Retinoids get an "on clean dry skin" note; the old toner note goes (2026-10-17).
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load([2026,9,17]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='retinoid_on_dry_skin_v1');
const old="Skin isn't sensitive — no need to let the toner buffer this. Give the toner (Anua Heartleaf) about 10 minutes to fully absorb first so it isn't taking any edge off this step's potency.";
const ret={id:4,genericName:'Topical Retinoid Cream 0.05%',brandName:'Ret-Avit (Tretinoin 0.05% w/w)',scheduled:true,session:'pm',notes:old};
const off={id:3,genericName:'Retinol/Vitamin A cream',brandName:'A313',scheduled:false,notes:'x'};
t('scheduled retinoids get the dry-skin note and lose the toner note',()=>{const o=M().apply({products:[ret,off,{id:9,genericName:'Gel Cleanser'}]});
  assert.ok(/dry skin/.test(o.products[0].waitInstruction));assert.ok(!/toner \(Anua/.test(o.products[0].notes),o.products[0].notes);
  assert.strictEqual(o.products[1],off);assert.ok(!o.products[2].waitInstruction);});
t('keeps any other note text',()=>{const o=M().apply({products:[{...ret,notes:old+' Use a pea-sized amount.'}]});assert.strictEqual(o.products[0].notes,'Use a pea-sized amount.');});
t('idempotent and safe on empty',()=>{const once=M().apply({products:[ret]});assert.strictEqual(M().apply(once),once);const e={};assert.strictEqual(M().apply(e),e);});
t('his library: both scheduled retinoids carry it',()=>{const p=seedProfile(get);const r=p.products.filter(x=>x.scheduled&&get('detectType')(x)==='retinoid');
  assert.ok(r.length>=2);r.forEach(x=>assert.ok(/dry skin/.test(x.waitInstruction||''),x.genericName));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
