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
  const pm=build(prods,'pm',5);const y=Object.keys(pm).sort().find(d=>d>=T&&has(pm,d,7));assert.ok(y);
  const d=add(y,1);const am=build(prods,'am',8,[{date:d,session:'am',productId:7}]);
  assert.ok(has(am,d,7));
});
t('a step added by hand in the evening also sits out the next morning',()=>{
  const busy=[...prods,P(20,'Peptide Serum','pm','daily'),P(21,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(22,'Squalane Face Oil','pm','daily')];
  const pm=build(busy,'pm',20),am=build(busy,'am',20);
  const y=Object.keys(pm).sort().find(d=>d>=T&&!has(pm,d,7)&&has(am,add(d,1),7));assert.ok(y,'fixture: no free night before a niacinamide morning');
  const pins=[{date:y,session:'pm',productId:7}];
  assert.ok(has(build(busy,'pm',20,pins),y,7));assert.ok(!has(build(busy,'am',20,pins),add(y,1),7),'still on the next morning');
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
