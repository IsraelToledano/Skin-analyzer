// A step added (or swapped in) by hand changes exactly one routine — its own
// date + session — and nothing else. Pins are an overlay on the finished day
// and never feed the rotation state (2026-10-03).
const assert=require('assert');const {load,seedProfile}=require('./sim');const {P,T}=require('./fixture');
const get=load([2026,8,20]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const add=get('addDaysStr'),cap=get('SESSION_CAP');
const build=(prods,logs,pins,session,days=30)=>get('buildSessionSchedule')(prods,logs,session,get('computeEpoch')(prods,session),add(T,days-1),cap,pins,[]);
const snap=(prods,logs,pins,days=30)=>{const o={};['am','pm'].forEach(s=>{const sc=build(prods,logs,pins,s,days);for(let i=0;i<days;i++){const d=add(T,i);o[`${d}:${s}`]=(sc[d]||[]).map(e=>e.productId).sort().join(',')}});return o;};
const changedKeys=(a,b)=>Object.keys(a).filter(k=>a[k]!==b[k]);

const cl=P(1,'Gel Cleanser','pm','daily'),ess=P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'});
const nia=P(2,'Niacinamide 10% + Zinc 1%','pm','daily'),mo=P(5,'water gel moisturizer','pm','daily');
const tret=P(4,'Topical Retinoid Cream 0.05%','pm','twice-weekly',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)'});
const clay=P(23,'Clay Face Mask / Bentonite Clay Mask','pm','weekly',{brandName:'Aztec Secret Indian Healing Clay',scheduled:false,nextDate:''});
const gly=P(30,'Glycolic Acid 7% Toning Solution','pm','weekly',{brandName:'The Ordinary',scheduled:false,nextDate:''});
const pep=P(40,'Peptide Serum','pm','daily',{scheduled:false,nextDate:''});
const lib=[cl,ess,nia,mo,tret,clay,gly,pep];

console.log('an added step changes only its own routine');
t('real library: every add, every day for 10 days — only that date+session changes',()=>{
  const prof=seedProfile(get);const prods=prof.products;const base=snap(prods,[],[],24);let n=0;
  for(let i=0;i<10;i++){const d=add(T,i);
    for(const s of ['am','pm']){
      const list=get('queueFor')(build(prods,[],[],s,24),prods,get('parseDate')(d));
      prods.filter(p=>!list.some(x=>x.id===p.id)).slice(0,12).forEach(p=>{
        const bumps=get('computeAddStepBumps')(p,'add',null,list,{session:s,ds:d,profile:prof});
        const after=snap(prods,[],[{id:1,date:d,session:s,productId:p.id,bumps}],24);
        const ch=changedKeys(base,after);n++;
        assert.ok(ch.every(k=>k===`${d}:${s}`),`${p.genericName} on ${d}:${s} also changed ${ch.filter(k=>k!==`${d}:${s}`).join(',')}`);
      });
    }}
  assert.ok(n>100,`only ${n} adds simulated`);
});
t('an added acid does not push tomorrow\'s retinoid back (no rest-night ripple)',()=>{
  const prods=[cl,mo,{...tret,frequency:'daily',rotationRole:'none'},gly];
  const base=snap(prods,[],[],10),after=snap(prods,[],[{date:T,session:'pm',productId:30}],10);
  assert.deepStrictEqual(changedKeys(base,after),[`${T}:pm`]);
});
t('a weekly product added early still runs on its regular day',()=>{
  const wk=P(50,'Retinol Serum 0.5%','pm','weekly',{rotationRole:'none',nextDate:add(T,3)});
  const prods=[cl,mo,wk];const sc=build(prods,[],[{date:T,session:'pm',productId:50}],'pm',10);
  assert.ok(sc[T].some(e=>e.productId===50&&e.pinned));assert.ok(sc[add(T,3)].some(e=>e.productId===50),'regular day lost');
});
console.log('the routine it was added to updates');
t('a conflicting step leaves that night (clay mask removes the retinoid)',()=>{
  const prods=[cl,ess,{...tret,frequency:'daily',rotationRole:'none'},mo,clay];
  const sc=build(prods,[],[{date:T,session:'pm',productId:23}],'pm',3);
  assert.ok(sc[T].some(e=>e.productId===23)&&!sc[T].some(e=>e.productId===4));
});
t('a same-role step is replaced (second essence)',()=>{
  const ess2=P(18,'Hydrating Serum','pm','daily',{brandName:'The Ordinary Marine Hyaluronics',scheduled:false,nextDate:''});
  const sc=build([cl,ess,mo,ess2],[],[{date:T,session:'pm',productId:18}],'pm',2);
  assert.ok(sc[T].some(e=>e.productId===18)&&!sc[T].some(e=>e.productId===17));
});
t('the cap bump recorded on the pin is applied, and nothing else is removed',()=>{
  const prods=[cl,ess,nia,mo,{...tret,frequency:'daily',rotationRole:'none'},pep];
  const list=get('queueFor')(build(prods,[],[],'pm',2),prods,get('parseDate')(T));
  const bumps=get('computeAddStepBumps')(pep,'add',null,list,{session:'pm',ds:T,profile:{logs:[]}});
  assert.strictEqual(bumps.length,1);
  const ids=build(prods,[],[{date:T,session:'pm',productId:40,bumps}],'pm',2)[T].map(e=>e.productId);
  assert.ok(ids.includes(40)&&!ids.includes(bumps[0]));
  assert.strictEqual(ids.length,list.length,'expected one in, one out');
});
t('swap: the swapped-out step is gone that night only, and does not carry',()=>{
  const prods=[cl,ess,nia,mo];const bumps=get('computeAddStepBumps')(pep,'swap',nia,prods,{session:'pm',ds:T,profile:{logs:[]}});
  const base=snap([...prods,pep],[],[],5),after=snap([...prods,pep],[],[{date:T,session:'pm',productId:40,bumps}],5);
  assert.deepStrictEqual(changedKeys(base,after),[`${T}:pm`]);
  const day=build([...prods,pep],[],[{date:T,session:'pm',productId:40,bumps}],'pm',2)[T].map(e=>e.productId);
  assert.ok(day.includes(40)&&!day.includes(2));
});
t('removing the pin restores the routine exactly',()=>{
  const prods=[cl,ess,{...tret,frequency:'daily',rotationRole:'none'},mo,clay];
  assert.deepStrictEqual(snap(prods,[],[],7),snap(prods,[],[{date:add(T,9),session:'pm',productId:23}],7));
});
t('a step already marked done is never removed',()=>{
  const r={...tret,frequency:'daily',rotationRole:'none'};const prods=[cl,ess,r,mo,clay];
  const logs=[{date:T,session:'pm',productId:4,done:true}];
  assert.deepStrictEqual(get('computeAddStepBumps')(clay,'add',null,[cl,ess,r,mo],{session:'pm',ds:T,profile:{logs}}),[]);
  const sc=build(prods,logs,[{date:T,session:'pm',productId:23,bumps:[4]}],'pm',2);
  assert.ok(sc[T].some(e=>e.productId===4),'done retinoid removed');
});
t('pinning a step already on the night adds no duplicate',()=>{
  const sc=build([cl,ess,mo],[],[{date:T,session:'pm',productId:17}],'pm',2);
  assert.strictEqual(sc[T].filter(e=>e.productId===17).length,1);assert.ok(sc[T].find(e=>e.productId===17).pinned);
});
console.log('skips');
t('skipping a hand-added step does not carry it into tomorrow',()=>{
  const prods=[cl,mo,pep];const pins=[{date:T,session:'pm',productId:40}];
  const sc=build(prods,[{date:T,session:'pm',productId:40,skipped:true,done:false}],pins,'pm',3);
  assert.ok(!sc[add(T,1)].some(e=>e.productId===40));
});
t('skipping a scheduled step on a night with an added step still carries it',()=>{
  const prods=[cl,ess,mo,pep];const pins=[{date:T,session:'pm',productId:40}];
  const sc=build(prods,[{date:T,session:'pm',productId:17,skipped:true,done:false}],pins,'pm',3);
  assert.ok(sc[add(T,1)].some(e=>e.productId===17&&e.carried));
});
console.log('Update routine is gone');
t('its functions and the routineSync field are removed',()=>{
  ['analyzeRoutine','computeRoutineUpdate','scheduleAddedProduct','routineSnapshot','RoutineUpdateBar'].forEach(n=>assert.throws(()=>get(n),n));
  assert.ok(!('routineSync' in get('EMPTY_PROFILE')));
});
t('drop_routine_sync_v1 strips the old baseline, keeps everything else, and is idempotent',()=>{
  const m=get('MIGRATIONS').find(x=>x.id==='drop_routine_sync_v1');assert.ok(m);
  const p={id:1,products:[cl],pins:[{date:T}],routineSync:{on:T,snapshot:{a:[1]}},migrations:[]};
  const one=m.apply(p);assert.ok(!('routineSync' in one));assert.deepStrictEqual(one,{id:1,products:[cl],pins:[{date:T}],migrations:[]});
  const out=get('applyMigrations')(p);assert.ok(!('routineSync' in out));assert.ok(out.migrations.includes('drop_routine_sync_v1'));
  assert.strictEqual(get('applyMigrations')(out),out);
  const q={id:1,products:[]};assert.strictEqual(m.apply(q),q);assert.strictEqual(m.apply(null),null);
});
console.log('malformed input');
t('null pins, unknown products, other-session pins and bad bumps are ignored',()=>{
  const prods=[cl,ess,mo];const base=build(prods,[],[],'pm',3);
  const sc=build(prods,[null],[{}],'pm',3);
  const sc2=build(prods,[],[null,{},{date:T,session:'pm',productId:999},{date:T,session:'am',productId:17,bumps:[1]},{date:T,session:'pm',productId:17,bumps:'x'}],'pm',3);
  assert.deepStrictEqual(sc2[add(T,1)],base[add(T,1)]);assert.ok(sc2[T].some(e=>e.productId===1));
  assert.ok(sc[T].length>0);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
