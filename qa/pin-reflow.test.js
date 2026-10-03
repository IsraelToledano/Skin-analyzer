// A step added (or swapped in) by hand updates the routine it was added to
// AND the routines after it: it counts as that product's use, the next
// same-role rotation night right after it moves on, and the steps it took
// out come back on their next eligible night. Nothing before it changes.
const assert=require('assert');const {load,seedProfile}=require('./sim');const {checkDay}=require('./audit');const {P,T}=require('./fixture');
const get=load([2026,8,20]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const add=get('addDaysStr'),cap=get('SESSION_CAP'),rr=get('rotationRoleFor');
const build=(prods,logs,pins,session,days=30)=>get('buildSessionSchedule')(prods,logs,session,get('computeEpoch')(prods,session),add(T,days-1),cap,pins,[]);
const snap=(prods,logs,pins,days=30)=>{const o={};['am','pm'].forEach(s=>{const sc=build(prods,logs,pins,s,days);for(let i=0;i<days;i++){const d=add(T,i);o[`${d}:${s}`]=(sc[d]||[]).map(e=>e.productId).sort().join(',')}});return o;};
const ids=(sc,d)=>(sc[d]||[]).map(e=>e.productId);

const cl=P(1,'Gel Cleanser','pm','daily'),ess=P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'});
const nia=P(2,'Niacinamide 10% + Zinc 1%','pm','daily'),mo=P(5,'water gel moisturizer','pm','daily');
const tretD={...P(4,'Topical Retinoid Cream 0.05%','pm','daily',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)'}),rotationRole:'none'};
const clay=P(23,'Clay Face Mask / Bentonite Clay Mask','pm','weekly',{brandName:'Aztec Secret Indian Healing Clay',scheduled:false,nextDate:''});
const gly=P(30,'Glycolic Acid 7% Toning Solution','pm','weekly',{brandName:'The Ordinary',scheduled:false,nextDate:''});
const pep=P(40,'Peptide Serum','pm','daily',{scheduled:false,nextDate:''});
const ex=(id,name,brand)=>P(id,name,'pm','weekly',{brandName:brand,rotationAnchor:T});
const micro=ex(60,'powder exfoliant','Dermalogica Daily Microfoliant'),sbm=ex(61,'chemical exfoliant toner','Some By Mi AHA.BHA.PHA 30 Days Miracle Toner');
const acids=sc=>d=>ids(sc,d).filter(i=>[30,60,61].includes(i));
// anchor T is a Sunday: exfoliant rotation nights are Sundays and Tuesdays.

console.log('the routines after an added step reflow');
t('YOUR CASE: an acid added the night before an acid night moves that acid to its next slot',()=>{
  const prods=[cl,mo,micro,sbm,gly];
  const base=acids(build(prods,[],[],'pm',15)),after=acids(build(prods,[],[{date:add(T,1),session:'pm',productId:30}],'pm',15));
  assert.ok(base(add(T,2)).length===1,'fixture: Tuesday is an acid night');
  assert.deepStrictEqual(after(add(T,1)),[30]);
  assert.deepStrictEqual(after(add(T,2)),[],'acid still the very next night');
  assert.strictEqual(after(add(T,7)).length,1,'the moved acid night did not come back on the next slot');
});
t('an acid added on an acid night is the only acid that night',()=>{
  const prods=[cl,mo,micro,sbm,gly];
  assert.deepStrictEqual(acids(build(prods,[],[{date:T,session:'pm',productId:30}],'pm',3))(T),[30]);
});
t('a weekly product added early is not repeated on its old day',()=>{
  const wk={...P(50,'Retinol Serum 0.5%','pm','weekly'),rotationRole:'none',nextDate:add(T,3)};
  const sc=build([cl,mo,wk],[],[{date:T,session:'pm',productId:50}],'pm',12);
  assert.ok(ids(sc,T).includes(50));assert.ok(!ids(sc,add(T,3)).includes(50),'still on its old day');
  assert.ok(ids(sc,add(T,7)).includes(50),'next use is not a week after the add');
});
t('a step the add took out comes back the next eligible night',()=>{
  const sc=build([cl,ess,tretD,mo,clay],[],[{date:T,session:'pm',productId:23,bumps:[4]}],'pm',4);
  assert.ok(!ids(sc,T).includes(4));assert.ok(ids(sc,add(T,1)).includes(4),'retinoid did not come back');
});
t('nothing before the add, and nothing in the other session, changes',()=>{
  const prof=seedProfile(get);const prods=prof.products;const base=snap(prods,[],[],24);let n=0;
  for(let i=0;i<10;i++){const d=add(T,i);
    for(const s of ['am','pm']){
      const list=get('queueFor')(build(prods,[],[],s,24),prods,get('parseDate')(d));
      prods.filter(p=>!list.some(x=>x.id===p.id)).slice(0,12).forEach(p=>{
        const bumps=get('computeAddStepBumps')(p,'add',null,list,{session:s,ds:d,profile:prof});
        const after=snap(prods,[],[{id:1,date:d,session:s,productId:p.id,bumps}],24);n++;
        Object.keys(base).forEach(k=>{const [kd,ks]=k.split(':');if(ks!==s||kd<d)assert.strictEqual(after[k],base[k],`${p.genericName} on ${d}:${s} changed ${k}`)});
      });
    }}
  assert.ok(n>100,`only ${n} adds simulated`);
});
t('real library: after every add, that night and the week after pass the routine rules, with no same-role rotation step the next night',()=>{
  const prof=seedProfile(get);const prods=prof.products;const problems=[];
  for(let i=0;i<7;i++){const d=add(T,i);
    for(const s of ['am','pm']){
      const list=get('queueFor')(build(prods,[],[],s,20),prods,get('parseDate')(d));
      const fits=p=>{const sess=p.scheduled?p.session:get('suggestSchedule')(p).session;return sess===s||sess==='both';};
      prods.filter(p=>!list.some(x=>x.id===p.id)&&fits(p)).forEach(p=>{
        const bumps=get('computeAddStepBumps')(p,'add',null,list,{session:s,ds:d,profile:prof});
        const pr={...prof,pins:[{id:1,date:d,session:s,productId:p.id,bumps}]};
        const sc=build(prods,[],pr.pins,s,20);
        for(let j=0;j<=7;j++){const dd=add(d,j);
          const day=get('sortForDay')(get('queueFor')(sc,prods,get('parseDate')(dd)),pr,dd,s);
          checkDay(get,`${dd}:${s}`,day,(sev,k,msg)=>{if(sev==='high')problems.push(`${p.genericName}@${d}:${s} → ${dd}: ${msg}`)});
          if(j===0&&!day.some(x=>x.id===p.id))problems.push(`${p.genericName} missing on ${d}`);
          if(j===0)bumps.forEach(b=>{if(day.some(x=>x.id===b))problems.push(`bumped ${b} still on ${d}`)});
          if(j===1&&rr(p)&&day.some(x=>x.id!==p.id&&rr(x)===rr(p)&&!x.pinned))problems.push(`${p.genericName}@${d}: another ${rr(p)} the next night`);
        }
      });
    }}
  if(problems.length){const g={};problems.forEach(x=>{const k=x.replace(/^[^@]*@[^ ]* → [^:]*: /,"").replace(/^[^@]*@\S+: /,"");(g[k]=g[k]||[]).push(x)});console.log(JSON.stringify(Object.entries(g).map(([k,v])=>[k,v.length,v.slice(0,3)]),null,1).slice(0,3000));}assert.deepStrictEqual(problems.slice(0,5),[]);
});
console.log('the routine it was added to');
t('a conflicting step leaves that night (clay mask removes the retinoid)',()=>{
  const sc=build([cl,ess,tretD,mo,clay],[],[{date:T,session:'pm',productId:23}],'pm',2);
  assert.ok(ids(sc,T).includes(23)&&!ids(sc,T).includes(4));
});
t('a same-role step is replaced (second essence)',()=>{
  const ess2=P(18,'Hydrating Serum','pm','daily',{brandName:'The Ordinary Marine Hyaluronics',scheduled:false,nextDate:''});
  const sc=build([cl,ess,mo,ess2],[],[{date:T,session:'pm',productId:18}],'pm',2);
  assert.ok(ids(sc,T).includes(18)&&!ids(sc,T).includes(17));
});
t('the cap bump recorded on the pin is applied: one in, one out',()=>{
  const prods=[cl,ess,nia,mo,tretD,pep];
  const list=get('queueFor')(build(prods,[],[],'pm',2),prods,get('parseDate')(T));
  const bumps=get('computeAddStepBumps')(pep,'add',null,list,{session:'pm',ds:T,profile:{logs:[]}});
  assert.strictEqual(bumps.length,1);
  const day=ids(build(prods,[],[{date:T,session:'pm',productId:40,bumps}],'pm',2),T);
  assert.ok(day.includes(40)&&!day.includes(bumps[0]));assert.strictEqual(day.length,list.length);
});
t('swap: the swapped-out step is off that night',()=>{
  const prods=[cl,ess,nia,mo,pep];const bumps=get('computeAddStepBumps')(pep,'swap',nia,prods,{session:'pm',ds:T,profile:{logs:[]}});
  const day=ids(build(prods,[],[{date:T,session:'pm',productId:40,bumps}],'pm',2),T);
  assert.ok(day.includes(40)&&!day.includes(2));
});
t('removing the pin restores every routine exactly',()=>{
  const prods=[cl,ess,tretD,mo,clay,micro,sbm,gly];
  assert.deepStrictEqual(snap(prods,[],[],10),snap(prods,[],[{date:add(T,12),session:'pm',productId:23}],10));
});
t('a step already marked done is never removed by an add',()=>{
  const prods=[cl,ess,tretD,mo,clay];const logs=[{date:T,session:'pm',productId:4,done:true}];
  assert.deepStrictEqual(get('computeAddStepBumps')(clay,'add',null,[cl,ess,tretD,mo],{session:'pm',ds:T,profile:{logs}}),[]);
  assert.ok(ids(build(prods,logs,[{date:T,session:'pm',productId:23,bumps:[4]}],'pm',2),T).includes(4),'done retinoid removed');
});
t('pinning a step already on the night adds no duplicate',()=>{
  const sc=build([cl,ess,mo],[],[{date:T,session:'pm',productId:17}],'pm',2);
  assert.strictEqual(ids(sc,T).filter(i=>i===17).length,1);assert.ok(sc[T].find(e=>e.productId===17).pinned);
});
console.log('skips');
t('a skipped scheduled step still moves to the next night',()=>{
  const sc=build([cl,ess,mo],[{date:T,session:'pm',productId:17,skipped:true,done:false}],[],'pm',3);
  assert.ok(sc[add(T,1)].some(e=>e.productId===17&&e.carried));
});
t('skipping a hand-added (unscheduled) step does not invent a standing step',()=>{
  const sc=build([cl,mo,pep],[{date:T,session:'pm',productId:40,skipped:true,done:false}],[{date:T,session:'pm',productId:40}],'pm',4);
  [1,2,3].forEach(i=>assert.ok(!ids(sc,add(T,i)).includes(40)));
});
console.log('Update routine is gone');
t('its functions and the routineSync field are removed',()=>{
  ['analyzeRoutine','computeRoutineUpdate','scheduleAddedProduct','routineSnapshot','RoutineUpdateBar'].forEach(n=>assert.throws(()=>get(n),n));
  assert.ok(!('routineSync' in get('EMPTY_PROFILE')));
});
t('drop_routine_sync_v1 strips the old baseline, keeps everything else, and is idempotent',()=>{
  const m=get('MIGRATIONS').find(x=>x.id==='drop_routine_sync_v1');assert.ok(m);
  const p={id:1,products:[cl],pins:[{date:T}],routineSync:{on:T,snapshot:{a:[1]}},migrations:[]};
  assert.deepStrictEqual(m.apply(p),{id:1,products:[cl],pins:[{date:T}],migrations:[]});
  const out=get('applyMigrations')(p);assert.ok(!('routineSync' in out));assert.strictEqual(get('applyMigrations')(out),out);
  const q={id:1,products:[]};assert.strictEqual(m.apply(q),q);assert.strictEqual(m.apply(null),null);
});
console.log('malformed input');
t('null logs/pins, unknown products, other-session pins and bad bumps are ignored',()=>{
  const prods=[cl,ess,mo];const base=build(prods,[],[],'pm',3);
  const sc=build(prods,[null],[null,{},{date:T,session:'pm',productId:999},{date:T,session:'am',productId:17,bumps:[1]},{date:T,session:'pm',productId:17,bumps:'x'}],'pm',3);
  assert.deepStrictEqual(sc[add(T,1)],base[add(T,1)]);assert.ok(ids(sc,T).includes(1));
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
