// The vitamin C serum gets a wait note (2026-10-16).
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load([2026,9,16]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='vitc_wait_note_v1');
const vc={id:5,genericName:'Vitamin C Serum',brandName:"Pura d'or 20% Vitamin C Serum",session:'am',frequency:'twice-weekly'};
const tan={id:11,genericName:'Self-Tanning Bronzing Water Serum with Vitamin C',brandName:'St. Tropez'};
t('his library: the Pura d\'or serum has the note, the St. Tropez self-tan does not',()=>{
  const p=seedProfile(get);const v=p.products.find(x=>/pura d.or/i.test(x.brandName||''));
  assert.ok(v&&/toner/.test(v.waitInstruction),'missing');const s=p.products.find(x=>/st\. tropez/i.test(x.brandName||''));
  if(s)assert.ok(!s.waitInstruction);});
t('skips a self-tan listed first and never touches it',()=>{const o=M().apply({products:[tan,vc]});assert.ok(!o.products[0].waitInstruction);assert.ok(o.products[1].waitInstruction);});
t('keeps a note he wrote; idempotent; safe without vitamin C or products',()=>{
  const mine={products:[{...vc,waitInstruction:'my note'}]};assert.strictEqual(M().apply(mine),mine);
  const once=M().apply({products:[vc]});assert.strictEqual(M().apply(once),once);
  const none={products:[{id:1,genericName:'Gel Cleanser'}]};assert.strictEqual(M().apply(none),none);const e={};assert.strictEqual(M().apply(e),e);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
