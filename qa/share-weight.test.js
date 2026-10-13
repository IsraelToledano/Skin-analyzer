// A product can get a bigger share of its rotation without pushing the
// others out (2026-10-14: Ginseng Essence Water felt under-used — it got an
// equal third of essence nights with Snail and Marine).
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load([2026,9,14]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const M=()=>get('MIGRATIONS').find(m=>m.id==='ginseng_bigger_share_v1');
const add=get('addDaysStr'),today=get('todayStr')();
const isG=p=>/ginseng/i.test([p.genericName,p.brandName].filter(Boolean).join(' '));
const count=(prods,days)=>{const to=add(today,days-1);
  const s=get('buildSessionSchedule')(prods,[],'pm',get('computeEpoch')(prods,'pm'),to,get('SESSION_CAP'),[],[]);
  const c={};for(let d=today;d<=to;d=add(d,1))(s[d]||[]).forEach(e=>c[e.productId]=(c[e.productId]||0)+1);return c;};
const prof=seedProfile(get);const G=prof.products.find(isG);
const peers=prof.products.filter(p=>/snail|marine/i.test([p.genericName,p.brandName].join(' '))&&p.scheduled!==false);

console.log('migration');
t('his library: ginseng is found and gets shareWeight 2',()=>{assert.ok(G,'no ginseng in seed');assert.strictEqual(G.shareWeight,2);});
t('only ginseng is weighted',()=>{prof.products.filter(p=>!isG(p)).forEach(p=>assert.strictEqual(p.shareWeight,undefined,p.genericName));});
t('idempotent; keeps a weight the user already has; no-op without ginseng',()=>{
  const a={products:[{id:1,genericName:'Ginseng Essence Water'}]};const once=M().apply(a);assert.strictEqual(once.products[0].shareWeight,2);
  assert.strictEqual(M().apply(once),once);
  const set={products:[{id:1,brandName:'Ginseng X',shareWeight:1}]};assert.strictEqual(M().apply(set),set);
  const none={products:[{id:2,genericName:'Snail Essence'}]};assert.strictEqual(M().apply(none),none);
  const e={};assert.strictEqual(M().apply(e),e);
});
console.log('scheduling');
t('ginseng gets clearly more nights than each peer over 60 days, and peers still appear',()=>{
  assert.ok(peers.length>=2,'peers '+peers.length);const c=count(prof.products,60);
  peers.forEach(p=>{assert.ok((c[p.id]||0)>=6,`${p.genericName} only ${c[p.id]}`);assert.ok((c[G.id]||0)>=(c[p.id]||0)*1.3,`G ${c[G.id]} vs ${p.genericName} ${c[p.id]}`);});
});
t('without the weight the three split evenly (weight is what changed it)',()=>{
  const flat=prof.products.map(p=>{const {shareWeight,...r}=p;return r;});const c=count(flat,60);
  const v=[G,...peers].map(p=>c[p.id]||0);assert.ok(Math.max(...v)-Math.min(...v)<=2,JSON.stringify(v));
});
t('never two essences on the same night',()=>{
  const to=add(today,59);const ids=new Set([G.id,...peers.map(p=>p.id)]);
  const s=get('buildSessionSchedule')(prof.products,[],'pm',get('computeEpoch')(prof.products,'pm'),to,get('SESSION_CAP'),[],[]);
  for(let d=today;d<=to;d=add(d,1))assert.ok((s[d]||[]).filter(e=>ids.has(e.productId)).length<=1,d);
});
t('malformed shareWeight (0, negative, string, NaN) behaves like no weight',()=>{
  const f=get('shareWeightOf');[0,-2,'3',NaN,null,undefined].forEach(w=>assert.strictEqual(f({shareWeight:w}),1,String(w)));assert.strictEqual(f({shareWeight:2}),2);
  const bad=prof.products.map(p=>isG(p)?{...p,shareWeight:'lots'}:p);count(bad,30);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
