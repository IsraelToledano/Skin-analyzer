// addStepIrritationRisks: why an added step would irritate, from what ran (2026-10-25).
const assert=require('assert');const {load}=require('./sim');const {P}=require('./fixture');
const get=load([2026,9,25]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const R=get('addStepIrritationRisks');const T='2026-10-25',Y='2026-10-24';const S='2026-10-10';
const sa=P(1,'Gentle Exfoliating SA Cleanser','am','daily',{brandName:'Cetaphil',nextDate:S});
const gel=P(2,'Gentle Gel Cleanser','pm','daily',{brandName:'Anua',nextDate:S});
const vc=P(5,'Vitamin C Serum','am','twice-weekly',{brandName:"Pura d'or 20%",nextDate:S});
const moist=P(6,'water gel moisturizer','both','daily',{nextDate:S});const spf=P(7,'Sunscreen Serum SPF 50','am','daily',{nextDate:S});
const micro=P(8,'powder exfoliant','pm','weekly',{brandName:'Dermalogica Daily Microfoliant',scheduled:false,nextDate:''});
const tret=P(4,'Topical Retinoid Cream 0.05%','pm','twice-weekly',{brandName:'Ret-Avit (Tretinoin 0.05% w/w)',scheduled:false,nextDate:''});
const snail=P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX',nextDate:S});
const nia=P(9,'Niacinamide 10% + Zinc 1%','am','daily',{nextDate:S});
const base=(o={})=>({products:[sa,gel,vc,moist,spf,micro,tret,snail,nia],logs:[],pins:[],procedures:[],...o});
const L=(date,session,productId,done=true)=>({id:Math.random(),date,session,productId,done,skipped:!done});
t('a hydrating step never warns',()=>{assert.deepStrictEqual(R(base({logs:[L(Y,'pm',8)]}),snail,T,'pm'),[]);});
t('vitamin C this morning (ticked) → exfoliant tonight warns, says "used", names it and explains',()=>{
  const r=R(base({logs:[L(T,'am',1),L(T,'am',5),L(T,'am',6)]}),micro,T,'pm');assert.strictEqual(r.length,1);
  assert.ok(/This morning you used Vitamin C Serum/.test(r[0].text)&&/acidic/.test(r[0].text),r[0].text);});
t('only the acid wash this morning → no warning (a wash is on for seconds)',()=>{assert.deepStrictEqual(R(base({logs:[L(T,'am',1),L(T,'am',6)]}),micro,T,'pm'),[]);});
t('exfoliant last night → vitamin C this morning warns',()=>{const r=R(base({logs:[L(Y,'pm',2),L(Y,'pm',8)]}),vc,T,'am');
  assert.strictEqual(r.length,1);assert.ok(/Last night you used powder exfoliant/.test(r[0].text)&&/exfoliated/.test(r[0].text),r[0].text);});
t('retinoid last night → exfoliant tonight warns about the thinner, reactive layer',()=>{const r=R(base({logs:[L(Y,'pm',2),L(Y,'pm',4)]}),micro,T,'pm');
  assert.ok(r.some(x=>/retinoid leaves the top layer/.test(x.text)),JSON.stringify(r));});
t('exfoliant last night → retinoid tonight warns',()=>{const r=R(base({logs:[L(Y,'pm',8)]}),tret,T,'pm');assert.ok(r.some(x=>/Freshly exfoliated/.test(x.text)));});
t('a step skipped last night does not count',()=>{assert.deepStrictEqual(R(base({logs:[L(Y,'pm',2),L(Y,'pm',8,false)]}),vc,T,'am'),[]);});
t('niacinamide this morning is not a strong active',()=>{assert.deepStrictEqual(R(base({logs:[L(T,'am',1),L(T,'am',9)]}),micro,T,'pm'),[]);});
t('nothing ticked this morning → goes by the plan and says "had"',()=>{const r=R(base(),micro,T,'pm');
  r.forEach(x=>assert.ok(/had/.test(x.text)));});
t('the same weekly exfoliant again 2 days later warns with the interval',()=>{const r=R(base({logs:[L('2026-10-23','pm',8)]}),micro,T,'pm');
  assert.ok(r.some(x=>/2 days ago/.test(x.text)&&/once a week/.test(x.text)),JSON.stringify(r));});
t('...but not 8 days later',()=>{const r=R(base({logs:[L('2026-10-17','pm',8)]}),micro,T,'pm');assert.ok(!r.some(x=>/ago|yesterday/.test(x.text)));});
t('inside a microneedling window an exfoliant warns',()=>{const r=R(base({procedures:[{date:T,type:'microneedling'}]}),micro,T,'pm');assert.ok(r.some(x=>/recovery window/.test(x.text)));});
t('malformed input does not throw',()=>{assert.deepStrictEqual(R(null,micro,T,'pm'),[]);assert.deepStrictEqual(R(base(),null,T,'pm'),[]);R({products:[micro]},micro,T,'pm');R(base({logs:[null,{date:T}]}),micro,T,'pm');});
// next-morning removals shown in the notice
t('nextMorningRemovals lists vitamin C and the acid wash after an added exfoliant',()=>{
  const p=base();const pins=[{id:1,date:T,session:'pm',productId:8}];const days=['2026-10-25','2026-10-26','2026-10-27','2026-10-28'];
  const d=days.find(d=>get('buildSessionSchedule')(p.products,[],'am',get('computeEpoch')(p.products,'am'),get('addDaysStr')(d,1),5,[],[])[get('addDaysStr')(d,1)].some(e=>e.productId===5));
  const r=get('nextMorningRemovals')(p,[{id:1,date:d,session:'pm',productId:8}],d).map(x=>x.name);
  assert.ok(r.includes('Vitamin C Serum')&&r.includes('Gentle Exfoliating SA Cleanser'),JSON.stringify(r));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
