// Explicit request 2026-10-08: COSRX AHA/BHA toner goes into the routine.
const assert=require('assert');const {load,seedProfile}=require('./sim');
const fs=require('fs');const get=load([2026,9,8]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='schedule_cosrx_aha_bha_toner_v1');
const cosrx={id:26,genericName:'Chemical Exfoliant Toner (AHA/BHA)',brandName:'COSRX AHA/BHA Clarifying Treatment Toner',notes:'',session:'',frequency:'',stepOrder:0,nextDate:'',isOneOff:false,scheduled:false};
t('the seeded library ends up with it scheduled PM weekly, still ranked Bad',()=>{
  const p=seedProfile(get).products.find(x=>x.id===26);
  assert.ok(p.scheduled);assert.strictEqual(p.session,'pm');assert.strictEqual(p.frequency,'weekly');
  assert.strictEqual(get('getProductRank')(p).tag,'bad');
});
t('it joins the exfoliant rotation pool and lands on an acid night within a month',()=>{
  const prof=seedProfile(get);const prods=prof.products;
  assert.strictEqual(get('rotationRoleFor')(prods.find(x=>x.id===26)),'exfoliant');
  const T=get('todayStr')();const sc=get('buildSessionSchedule')(prods,[],'pm',get('computeEpoch')(prods,'pm'),get('addDaysStr')(T,34),get('SESSION_CAP'),[],[]);
  const nights=Object.keys(sc).filter(d=>d>=T&&sc[d].some(e=>e.productId===26));
  assert.ok(nights.length>=1,'never scheduled in 35 days');
  nights.forEach(d=>{const acids=sc[d].filter(e=>get('rotationRoleFor')(prods.find(x=>x.id===e.productId)||{})==='exfoliant');assert.strictEqual(acids.length,1,d)});
});
t('idempotent, and never rewrites one already scheduled by hand',()=>{
  const once=M().apply({products:[cosrx]});assert.strictEqual(M().apply(once),once);
  const mine={...cosrx,scheduled:true,session:'pm',frequency:'monthly'};const p={products:[mine]};assert.strictEqual(M().apply(p),p);
});
t('no-op when the product is not in the library; empty/malformed input',()=>{
  const p={products:[{id:1,genericName:'Gel Cleanser',brandName:''}]};assert.strictEqual(M().apply(p),p);
  const e={};assert.strictEqual(M().apply(e),e);
});
t('his real export: scheduled after migrations, other products untouched',()=>{
  const raw=JSON.parse(Buffer.from(fs.readFileSync('/mnt/user-data/uploads/attachment.txt','utf8').trim(),'base64').toString()).profile;
  const before=get('applyMigrations')({...raw,migrations:raw.migrations.concat(['schedule_cosrx_aha_bha_toner_v1'])});
  const after=get('applyMigrations')(raw);
  assert.ok(after.products.find(x=>x.id===26).scheduled);
  after.products.filter(x=>x.id!==26).forEach(x=>assert.deepStrictEqual(x,before.products.find(y=>y.id===x.id)));
},);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
