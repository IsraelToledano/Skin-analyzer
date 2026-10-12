// Rule (2026-10-08): a product that ran in the evening doesn't run again the
// next morning — except cleanser, moisturizer and sunscreen.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');const {audit}=require('./audit');const {P,T}=require('./fixture');
const get=load([2026,8,20]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const add=get('addDaysStr'),cap=get('SESSION_CAP');
const build=(prods,s,days=30,pins=[],logs=[])=>get('buildSessionSchedule')(prods,logs,s,get('computeEpoch')(prods,s),add(T,days-1),cap,pins,[]);
const has=(sc,d,id)=>(sc[d]||[]).some(e=>e.productId===id);
const cl=P(1,'Gentle Gel Cleanser','both','daily'),mo=P(5,'Barrier Repair Moisturizer','both','daily'),spf=P(6,'SPF 50 Sunscreen','am','daily');
const nia=P(7,'Niacinamide 10% + Zinc 1%','both','daily',{brandName:'The Ordinary'}),ton=P(2,'Hydrating Toner','both','daily');
const prods=[cl,mo,spf,nia,ton];
t('a both-session product never runs the morning after it ran at night (60 days)',()=>{
  const am=build(prods,'am',60),pm=build(prods,'pm',60);let n=0;
  for(let i=1;i<60;i++){const d=add(T,i),y=add(T,i-1);[7,2].forEach(id=>{if(has(pm,y,id)){n++;assert.ok(!has(am,d,id),`${id} PM ${y} then AM ${d}`)}})}
  assert.ok(n>10,'fixture never put them in PM');
});
t('it still runs on mornings after a night without it',()=>{
  const busy=[...prods,P(20,'Peptide Serum','pm','daily'),P(21,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(22,'Squalane Face Oil','pm','daily')];
  const am=build(busy,'am',30),pm=build(busy,'pm',30);
  const free=[];for(let i=1;i<30;i++){const d=add(T,i);if(!has(pm,add(T,i-1),7))free.push(d)}
  assert.ok(free.length>3,'fixture: niacinamide never left out of the evening');
  assert.ok(free.filter(d=>has(am,d,7)).length>=free.length*0.8,`AM on only ${free.filter(d=>has(am,d,7)).length}/${free.length} free mornings`);
});
t('cleanser, moisturizer and sunscreen still run every morning',()=>{
  const am=build(prods,'am',30);for(let i=0;i<30;i++){const d=add(T,i);[1,5,6].forEach(id=>assert.ok(has(am,d,id),`${id} missing ${d}`))}
});
t('the evening plan is unchanged by the rule (it only looks backwards from the morning)',()=>{
  const pm=build(prods,'pm',20);const pm2=get('buildSessionSchedule')(prods,[],'pm',get('computeEpoch')(prods,'pm'),add(T,19),cap,[],[]);
  assert.deepStrictEqual(pm,pm2);
});
t('a step added by hand to the morning still shows, even after it ran the night before',()=>{
  const pm=build(prods,'pm',5);const y=Object.keys(pm).sort().find(d=>d>=T&&has(pm,d,2));assert.ok(y);
  const d=add(y,1);const am=build(prods,'am',8,[{date:d,session:'am',productId:2}]);
  assert.ok(has(am,d,2));
});
t('a step added by hand in the evening also sits out the next morning',()=>{
  const busy=[...prods,P(20,'Peptide Serum','pm','daily'),P(21,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(22,'Squalane Face Oil','pm','daily')];
  const pm=build(busy,'pm',20),am=build(busy,'am',20);
  const y=Object.keys(pm).sort().find(d=>d>=T&&!has(pm,d,7)&&has(am,add(d,1),7));assert.ok(y,'fixture: no free night before a niacinamide morning');
  const pins=[{date:y,session:'pm',productId:7}];
  assert.ok(has(build(busy,'pm',20,pins),y,7));assert.ok(!has(build(busy,'am',20,pins),add(y,1),7),'still on the next morning');
});
t('a logged evening counts what actually ran: on the plan but not used → it can run this morning',()=>{
  // evenings in the past (today is later than all of them)
  const gL=require('./sim').load([2026,11,1]);const build=(prods,s,days=30,pins=[],logs=[])=>gL('buildSessionSchedule')(prods,logs,s,gL('computeEpoch')(prods,s),add(T,days-1),cap,pins,[]);
  const busy=[...prods,P(20,'Peptide Serum','pm','daily'),P(21,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(22,'Squalane Face Oil','pm','daily')];
  const pm=build(busy,'pm',20);const y=Object.keys(pm).sort().find(d=>d>=T&&has(pm,d,2));assert.ok(y);const d=add(y,1);
  const notUsed=[{date:y,session:'pm',productId:1,done:true},{date:y,session:'pm',productId:5,done:true}];
  assert.ok(has(build(busy,'am',20,[],notUsed),d,2),'still kept out although it never ran');
  const skipped=[...notUsed,{date:y,session:'pm',productId:2,done:false,skipped:true}];
  assert.ok(has(build(busy,'am',20,[],skipped),d,2),'kept out after being skipped');
  const used=[...notUsed,{date:y,session:'pm',productId:2,done:true}];
  assert.ok(!has(build(busy,'am',20,[],used),d,2),'ran last night and again this morning');
  assert.ok(!has(build(busy,'am',20,[],[]),d,2),'an unlogged night should go by the plan');
});
t('his morning of Oct 12: niacinamide is back after a mask night it never ran on',()=>{
  const ess=P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'});
  const mask=P(10,'hydrating cream mask','pm','weekly',{brandName:'Caudalie VinoHydra Masque-Crème Hydratant',rotationRole:'none',scheduled:false,nextDate:''});
  const lib=[cl,mo,spf,nia,ess,mask,P(20,'Peptide Serum','pm','daily'),P(22,'Squalane Face Oil','pm','daily')];
  const y=add(T,3),d=add(T,4);const pins=[{date:y,session:'pm',productId:10,bumps:[]}];
  const logs=[1,5,10].map(id=>({date:y,session:'pm',productId:id,done:true}));
  assert.ok(has(build(lib,'am',8,pins,logs),d,7));
});
t('a treatment serum set to both sessions runs once a day — mornings — never morning and evening',()=>{
  const am=build(prods,'am',30),pm=build(prods,'pm',30);
  for(let i=0;i<30;i++){const d=add(T,i);assert.ok(!has(pm,d,7),'niacinamide in the evening '+d)}
  assert.ok(Object.keys(am).filter(d=>d>=T&&has(am,d,7)).length>=25,'niacinamide missing from most mornings');
  assert.ok(Object.keys(pm).some(d=>has(pm,d,2)),'a both-session toner still runs in the evening');
});
t('niacinamide_once_a_day_v1 moves a both-session niacinamide to mornings, once, and leaves others alone',()=>{
  const m=get('MIGRATIONS').find(x=>x.id==='niacinamide_once_a_day_v1');
  const out=m.apply({products:[nia,ton,mo]});assert.strictEqual(out.products[0].session,'am');assert.strictEqual(out.products[1].session,'both');assert.strictEqual(out.products[2].session,'both');
  assert.strictEqual(m.apply(out),out);const pmOnly={products:[{...nia,session:'pm'}]};assert.strictEqual(m.apply(pmOnly),pmOnly);const e={};assert.strictEqual(m.apply(e),e);
});
t('the audit flags a treatment active running morning and evening the same day',()=>{
  const fake={[`${T}:am`]:[cl,nia,mo,spf],[`${T}:pm`]:[cl,nia,mo]};
  assert.ok(audit(get,{products:prods},fake,1).issues.some(i=>/morning and again that evening/.test(i.msg)));
});
t('tonight, half ticked off, still keeps tonight\'s steps out of tomorrow morning',()=>{
  const g2=require('./sim').load([2026,8,22]);const today=g2('todayStr')();const tomorrow=g2('addDaysStr')(today,1);
  const b=(lg)=>g2('buildSessionSchedule')(prods,lg,'am',g2('computeEpoch')(prods,'am'),g2('addDaysStr')(today,3),g2('SESSION_CAP'),[],[]);
  const pmP=g2('buildSessionSchedule')(prods,[],'pm',g2('computeEpoch')(prods,'pm'),g2('addDaysStr')(today,3),g2('SESSION_CAP'),[],[]);
  assert.ok((pmP[today]||[]).some(e=>e.productId===2),'fixture: toner tonight');
  const partly=[{date:today,session:'pm',productId:1,done:true}];
  assert.ok(!(b(partly)[tomorrow]||[]).some(e=>e.productId===2),'toner tomorrow morning after tonight');
});
t('his library: the 30-day plan has no evening-then-morning repeat and passes the audit',()=>{
  const prof=seedProfile(get);const pl=plan(get,prof,30);const r=audit(get,prof,pl,30);
  assert.deepStrictEqual(r.issues.filter(i=>i.sev==='high').map(i=>i.msg),[]);
});
t('the audit flags a repeat, and lets foundation steps through',()=>{
  const d0=T,d1=add(T,1);const fake={[`${d0}:pm`]:[cl,nia,mo],[`${d1}:am`]:[cl,nia,mo,spf],[`${d0}:am`]:[cl,mo,spf],[`${d1}:pm`]:[cl,mo]};
  const r=audit(get,{products:prods},fake,2);const hits=r.issues.filter(i=>/next morning/.test(i.msg));
  assert.strictEqual(hits.length,1);assert.ok(/Niacinamide/.test(hits[0].msg));
});
t('empty and malformed input does not throw',()=>{
  assert.deepStrictEqual(Object.values(build([],'am',3)).flat(),[]);
  build([nia],'am',3,[null,{}],[null]);
  assert.ok(!get('blockedMorningAfter')(null));assert.ok(!get('blockedMorningAfter')(mo));assert.ok(get('blockedMorningAfter')(nia));
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
