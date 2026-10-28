// The irritation warning and the routine follow the same rules: nothing the
// routine schedules by itself ever sets the warning off (2026-10-29 — it
// fired on 49 scheduled steps in 40 days, and on swap suggestions).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
[[2026,9,29],[2026,10,15]].forEach(day=>{
  const get=load(day);const seed=seedProfile(get);const add=get('addDaysStr');const start=add(get('todayStr')(),-10);
  const prof={...seed,products:seed.products.map(p=>p.nextDate?{...p,nextDate:start}:p)};
  const pl=plan(get,prof,60);const R=get('addStepIrritationRisks');
  t(`his library from ${get('todayStr')()}: no scheduled step in 60 days would set off the warning`,()=>{
    const bad=[];Object.keys(pl).forEach(k=>{const [d,s]=k.split(':');pl[k].forEach(p=>{R(prof,p,d,s).forEach(r=>bad.push(`${k} ${p.genericName}: ${r.text.slice(0,90)}`));});});
    assert.deepStrictEqual(bad.slice(0,5),[]);});
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
