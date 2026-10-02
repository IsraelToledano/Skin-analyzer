const assert=require('assert');const A=require('./harness').loadApp();const {P,profile,T}=require('./fixture');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const cl=P(1,'Gel Cleanser','pm','daily'),oil=P(8,'cleansing oil','pm','weekly',{brandName:'SKIN1004 Madagascar Centella Light Cleansing Oil',linkGroup:'g'}),gel={...cl,linkGroup:'g'};
const tret=P(4,'Topical Retinoid Cream 0.05%','pm','twice-weekly',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)'});
const ess=P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),nia=P(2,'Niacinamide 10% + Zinc 1%','pm','daily'),mo=P(5,'water gel moisturizer','pm','daily');
const clay=P(23,'Clay Face Mask / Bentonite Clay Mask','pm','weekly',{brandName:'Aztec Secret Indian Healing Clay'});
const cream=P(10,'hydrating cream mask','pm','weekly',{brandName:'Caudalie VinoHydra Masque-Crème Hydratant',rotationRole:'none'});
const gly=P(30,'Glycolic Acid 7% Toning Solution','pm','weekly',{brandName:'The Ordinary'});
const ctx={session:'pm',ds:T,profile:profile()};
console.log('clay mask rules');
t('clay mask clashes with a retinoid and with a leave-on acid',()=>{assert.ok(A.productsConflict(clay,tret));assert.ok(A.productsConflict(clay,gly))});
t('clay mask does not clash with hydrators or moisturizer',()=>{[ess,nia,mo,cl,cream].forEach(p=>assert.ok(!A.productsConflict(clay,p),p.genericName))});
t('a leave-on cream mask is not a clay mask',()=>assert.ok(!A.conflictGroupsFor(cream).includes('clay-mask')));
t('YOUR CASE: adding a clay mask on a tretinoin night removes the tretinoin',()=>{
  const bumps=A.computeAddStepBumps(clay,'add',null,[cl,ess,tret,mo],ctx);assert.deepStrictEqual(bumps,[4]);
});
t('and the reason given is the clash',()=>{
  const r=A.explainAddStepBumps(clay,[4],[cl,ess,tret,mo]);assert.strictEqual(r[0].name,'Topical Retinoid Cream 0.05%');assert.ok(/same session/.test(r[0].why));
});
t('adding a retinoid on a clay night removes the clay mask instead',()=>assert.deepStrictEqual(A.computeAddStepBumps(tret,'add',null,[cl,clay,ess,mo],ctx),[23]));
t('the rebuilt schedule drops the tretinoin from that night',()=>{
  const prods=[cl,ess,tret,mo,clay];const pins=[{date:T,session:'pm',productId:23}];
  const sc=A.buildSessionSchedule(prods,[],'pm',T,A.addDaysStr(T,3),A.SESSION_CAP,pins,[]);
  assert.ok(sc[T].some(e=>e.productId===23)&&!sc[T].some(e=>e.productId===4));
});
console.log('one mask per session');
t('adding a clay mask on the hydrating-mask night replaces it',()=>{
  const bumps=A.computeAddStepBumps(clay,'add',null,[cl,ess,cream,mo],ctx);assert.deepStrictEqual(bumps,[10]);
  assert.ok(/same role/.test(A.explainAddStepBumps(clay,bumps,[cl,ess,cream,mo])[0].why));
});
console.log('the step cap never removes the foundation');
const full=[oil,gel,ess,nia,mo];
t('over the cap, a treatment step is bumped — never a cleanser or moisturizer',()=>{
  const add=P(40,'Peptide Serum','pm','daily');const b=A.computeAddStepBumps(add,'add',null,full,ctx);
  assert.strictEqual(b.length,1);assert.ok([17,2].includes(b[0]),'bumped '+b[0]);
});
t('if only foundation steps are left, nothing is bumped',()=>{
  const day=[oil,gel,mo,P(41,'Barrier Cream','pm','daily'),P(42,'Second Gel Cleanser x','pm','daily')].map((p,i)=>({...p,id:100+i}));
  const b=A.computeAddStepBumps(P(43,'Squalane Face Oil','pm','daily'),'add',null,day,ctx);
  b.forEach(id=>{const p=day.find(x=>x.id===id);assert.ok(!['cleanser','cleanser_oil','moisturizer','spf'].includes(A.detectType(p))||false,'foundation bumped: '+(p&&p.genericName))});
});
t('a second water cleanser still replaces the first (same role, not the cap)',()=>{
  const b=A.computeAddStepBumps(P(44,'Foaming Cleanser','pm','daily'),'add',null,[cl,ess,mo],ctx);assert.deepStrictEqual(b,[1]);
});
console.log('carry-over vs an added step');
t('a carried step that clashes with an added step leaves that night only — the next night is untouched',()=>{
  const ret2={...P(60,'Retinol Serum','pm','weekly'),rotationRole:'none'};
  const prods=[cl,mo,ret2,{...clay,rotationRole:'none'}];
  const d1=A.addDaysStr(T,1),d2=A.addDaysStr(T,2);
  const logs=[{date:T,session:'pm',productId:60,done:false,skipped:true}];
  const pins=[{date:d1,session:'pm',productId:23}];
  const sc=A.buildSessionSchedule(prods,logs,'pm',T,A.addDaysStr(T,4),A.SESSION_CAP,pins,[]);
  const base=A.buildSessionSchedule(prods,logs,'pm',T,A.addDaysStr(T,4),A.SESSION_CAP,[],[]);
  assert.ok(sc[T].some(e=>e.productId===60),'retinol not on day 0');
  assert.ok(!sc[d1].some(e=>e.productId===60),'carried retinol stacked onto the clay night');
  assert.ok(sc[d1].some(e=>e.productId===23&&e.pinned),'clay mask missing');
  [d2,A.addDaysStr(T,3),A.addDaysStr(T,4)].forEach(d=>assert.deepStrictEqual(sc[d],base[d],d));
});
console.log('failure cases');
t('explain handles unknown ids and empty input',()=>{assert.deepStrictEqual(A.explainAddStepBumps(clay,[999],[cl]),[]);assert.deepStrictEqual(A.explainAddStepBumps(null,[1],[cl]),[]);assert.deepStrictEqual(A.explainAddStepBumps(clay,null,null),[])});
t('bumps on an empty day',()=>assert.deepStrictEqual(A.computeAddStepBumps(clay,'add',null,[],ctx),[]));
t('swap mode is unchanged: only the swapped-out step',()=>assert.deepStrictEqual(A.computeAddStepBumps(clay,'swap',tret,[cl,tret,mo],ctx),[4]));
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
