// Rotation-pool members keep their own frequency: a weekly exfoliant that
// wins the first exfoliant night of the week must not also win the second
// one two days later (the Microfoliant Wed + Fri bug, 2026-10-02).
const assert=require('assert');const {load}=require('./sim');const {P,baseProducts,T}=require('./fixture');
const get=load([2026,8,20]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const add=get('addDaysStr'),between=get('daysBetween'),rr=get('rotationRoleFor'),FD=get('FREQ_DAYS');
const ANCHOR=T;
const ex=(id,name,brand,freq='weekly')=>P(id,name,'pm',freq,{brandName:brand,rotationAnchor:ANCHOR});
const micro=ex(60,'powder exfoliant','Dermalogica Daily Microfoliant');
const sbm=ex(61,'chemical exfoliant toner','Some By Mi AHA.BHA.PHA 30 Days Miracle Toner');
const cau=ex(62,'Blemish Control Salicylic Serum','Caudalie Vinopure Blemish Control Salicylic Serum');
const peel=ex(63,'chemical exfoliant / peel','The Ordinary AHA 30% + BHA 2% Peeling Solution','monthly');
const withEx=extra=>baseProducts().filter(p=>p.id!==4).concat(extra);
const plan=(prods,days=90)=>{const to=add(T,days-1);return {to,s:get('buildSessionSchedule')(prods,[],'pm',get('computeEpoch')(prods,'pm'),to,get('SESSION_CAP'),[],[])};};
const exNights=(prods,days)=>{const {to,s}=plan(prods,days);const byId=new Map(prods.map(p=>[p.id,p]));const out=[];
  for(let d=T;d<=to;d=add(d,1))(s[d]||[]).forEach(e=>{const p=byId.get(e.productId);if(p&&rr(p)==='exfoliant')out.push({d,id:p.id})});return out;};
const slotDates=days=>{const out=[];for(let d=T;d<=add(T,days-1);d=add(d,1)){const o=between(ANCHOR,d)%7;if(o===0||o===2)out.push(d)}return out;};

console.log('pool members respect their own interval');
t('the ranked fixtures resolve to best/good, so weighting is really in play',()=>{
  assert.strictEqual(get('getProductRank')(micro).tag,'best');
  [sbm,cau].forEach(p=>assert.strictEqual(get('getProductRank')(p).tag,'good',p.brandName));
});
t('no weekly exfoliant runs twice inside 7 days (90-day plan)',()=>{
  const n=exNights(withEx([micro,sbm,cau]),90);const last={};
  n.forEach(({d,id})=>{if(last[id])assert.ok(between(last[id],d)>=7,`${id} on ${last[id]} and ${d}`);last[id]=d});
});
t('the best-ranked member still gets the largest share',()=>{
  const n=exNights(withEx([micro,sbm,cau]),90);const c={};n.forEach(x=>c[x.id]=(c[x.id]||0)+1);
  assert.ok(c[60]>=c[61]&&c[60]>=c[62],JSON.stringify(c));
});
t('every exfoliant slot is still filled exactly once',()=>{
  const n=exNights(withEx([micro,sbm,cau]),63);
  assert.deepStrictEqual(n.map(x=>x.d),slotDates(63));
});
t('a monthly peel never repeats inside 30 days',()=>{
  const n=exNights(withEx([micro,sbm,cau,peel]),120).filter(x=>x.id===63);
  assert.ok(n.length>=2,`only ${n.length} peel nights`);
  for(let i=1;i<n.length;i++)assert.ok(between(n[i-1].d,n[i].d)>=30,`${n[i-1].d} -> ${n[i].d}`);
});
console.log('fallback keeps slots from being dropped');
t('a lone weekly exfoliant still fills both weekly slots (no starved night)',()=>{
  const n=exNights(withEx([micro]),28);
  assert.deepStrictEqual(n.map(x=>x.d),slotDates(28));
});
t('two members: both slots of every week are filled, by different products',()=>{
  const n=exNights(withEx([micro,sbm]),56);
  assert.deepStrictEqual(n.map(x=>x.d),slotDates(56));
  for(let i=0;i<n.length;i+=2)assert.notStrictEqual(n[i].id,n[i+1].id,`week of ${n[i].d}`);
});
console.log('malformed input');
t('unknown or missing frequency does not throw and fills the slots',()=>{
  const a={...sbm,frequency:'sometimes'},b={...cau,frequency:undefined};
  assert.strictEqual(FD['sometimes'],undefined);
  const n=exNights(withEx([a,b]),28);
  assert.deepStrictEqual(n.map(x=>x.d),slotDates(28));
});
t('an empty pool and an empty product list do not throw',()=>{
  plan(withEx([]),14);plan([],14);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
