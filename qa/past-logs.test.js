// A step logged done on a past day counts as used even when the rebuilt plan
// for that day had something else (2026-10-15: the AHA 30% peel was done
// Oct 9 and came back Oct 14). Plus the peel's mostly-spot migration.
const assert=require('assert');const {load}=require('./sim');const {P,baseProducts}=require('./fixture');
const get=load([2026,9,15]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const add=get('addDaysStr'),between=get('daysBetween'),today=get('todayStr')();
const START='2026-09-01';
const peel=(freq='monthly')=>P(22,'chemical exfoliant / peeling solution','pm',freq,{brandName:'The Ordinary AHA 30% + BHA 2% Peeling Solution',nextDate:START,rotationAnchor:START});
// two weekly exfoliants share the pool, as in his library (a lone pool
// member deliberately fills every slot regardless of its interval)
const ex=(id,name,brand)=>P(id,name,'pm','weekly',{brandName:brand,nextDate:START,rotationAnchor:START});
const prods=(f)=>baseProducts().filter(p=>p.id!==4).map(p=>({...p,nextDate:START})).concat(peel(f),ex(60,'powder exfoliant','Dermalogica Daily Microfoliant'),ex(61,'chemical exfoliant toner','Some By Mi AHA.BHA.PHA 30 Days Miracle Toner'));
const nights=(ps,logs,to='2026-12-31',session='pm')=>{const s=get('buildSessionSchedule')(ps,logs,session,START,to,get('SESSION_CAP'),[],[]);
  return d=>(s[d]||[]).map(e=>e.productId);};
const peelDays=(ps,logs)=>{const n=nights(ps,logs);const out=[];for(let d=START;d<='2026-12-31';d=add(d,1))if(n(d).includes(22))out.push(d);return out;};
const L=(date,productId,o={})=>({id:Math.random(),date,productId,session:'pm',done:true,...o});

console.log('past done logs count');
const base=peelDays(prods(),[]);
const offDay=add(base.filter(d=>d<today).pop(),9);if(offDay>=today||base.includes(offDay))throw new Error('fixture: bad off-plan day '+offDay);
t('fixture: the plan alone has a peel night soon after the off-plan day',()=>{assert.ok(base.some(d=>d>offDay&&d>=today&&between(offDay,d)<30),base.join(' '));});
t('an off-plan peel done on a past day pushes the next one a full month out',()=>{
  const d=peelDays(prods(),[L(offDay,22)]);assert.ok(d.includes(offDay));
  const next=d.find(x=>x>offDay);assert.ok(between(offDay,next)>=30,`${offDay} -> ${next}`);
});
t('a skipped or not-done log does not count',()=>{
  assert.deepStrictEqual(peelDays(prods(),[L(offDay,22,{done:false,skipped:true})]),base);
  assert.deepStrictEqual(peelDays(prods(),[L(offDay,22,{done:false})]),base);
});
t('a log for today or later is not injected (today is still in progress)',()=>{
  const n=nights(prods(),[L(add(today,2),22)]);const planned=nights(prods(),[]);
  assert.deepStrictEqual(n(add(today,2)),planned(add(today,2)));
});
t('the AM log of a PM product, unknown ids and string ids do not throw or leak in',()=>{
  const logs=[L(offDay,22,{session:'am'}),L(offDay,999),L(offDay,'x-v1'),{date:offDay},null];
  assert.deepStrictEqual(peelDays(prods(),logs),base);
});
t('a logged active keeps the next night active-free (rest night)',()=>{
  const ret=P(3,'Retinol Serum 0.5%','pm','daily',{nextDate:START});
  const ps=prods().concat(ret).filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);
  const n=nights(ps,[L(offDay,22)]);assert.ok(!n(add(offDay,1)).includes(3),n(add(offDay,1)).join(','));
});
t('the past-day list shows what was done',()=>{const n=nights(prods(),[L(offDay,22)]);assert.ok(n(offDay).includes(22));});

console.log('AHA 30% mostly spot');
const M=()=>get('MIGRATIONS').find(m=>m.id==='aha30_mostly_spot_v1');
t('sets 8-weekly, spot flag and a spot-use note; leaves others alone',()=>{
  const out=M().apply({products:[peel(),{id:36,genericName:'One Step Peel',frequency:'weekly'}]});
  const p=out.products[0];assert.strictEqual(p.frequency,'8-weekly');assert.strictEqual(p.spotTreatment,true);assert.ok(/spot/i.test(p.notes));
  assert.strictEqual(out.products[1].frequency,'weekly');
});
t('idempotent, no-op without the peel, safe on empty',()=>{
  const once=M().apply({products:[peel()]});assert.strictEqual(M().apply(once),once);
  const none={products:[{id:1,genericName:'x'}]};assert.strictEqual(M().apply(none),none);const e={};assert.strictEqual(M().apply(e),e);
});
t('8-weekly peel never repeats inside 56 days',()=>{
  const d=peelDays(prods('8-weekly'),[]);assert.ok(d.length>=2,d.join(' '));for(let i=1;i<d.length;i++)assert.ok(between(d[i-1],d[i])>=56,`${d[i-1]}->${d[i]}`);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
