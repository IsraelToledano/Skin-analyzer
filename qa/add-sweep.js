// Simulates "+ Add step" for every product in the library, on every day and
// session for the next N days, through the app's own add path (pin +
// computeAddStepBumps skip logs), rebuilds the schedule, and checks the
// resulting day — and the next day, where a bumped step carries over.
const {load,seedProfile}=require('./sim');const {checkDay}=require('./audit');
const DAYS=+(process.argv.find(a=>/^--days=/.test(a))||'--days=60').split('=')[1];
const get=load();const base=seedProfile(get);
const T=get('todayStr')();const add=get('addDaysStr');
const build=(prof,toDs,session)=>get('buildSessionSchedule')(prof.products,prof.logs||[],session,get('computeEpoch')(prof.products,session),toDs,get('SESSION_CAP'),prof.pins||[],prof.procedures||[]);
const dayList=(prof,sched,d,session)=>get('sortForDay')(get('queueFor')(sched,prof.products,get('parseDate')(d)),prof,d,session);
const fits=(p,s)=>{const sess=p.scheduled?p.session:get('suggestSchedule')(p).session;return sess===s||sess==='both';};
const issues={};let sims=0;const t0=Date.now();
const full={am:build(base,add(T,DAYS),'am'),pm:build(base,add(T,DAYS),'pm')};
for(let i=0;i<DAYS;i++){
  const d=add(T,i);
  for(const s of ['am','pm']){
    const list=dayList(base,full[s],d,s);
    const candidates=base.products.filter(p=>!list.some(x=>x.id===p.id)&&fits(p,s));
    for(const p of candidates){
      sims++;
      const bumps=get('computeAddStepBumps')(p,'add',null,list,{session:s,ds:d,profile:base});
      const prof={...base,pins:[...(base.pins||[]),{id:1,date:d,session:s,productId:p.id}],
        logs:[...(base.logs||[]),...bumps.map((id,k)=>({id:'b'+k,date:d,productId:id,session:s,done:false,skipped:true}))]};
      const sched=build(prof,add(d,1),s);
      [d,add(d,1)].forEach((dd,j)=>{
        const after=dayList(prof,sched,dd,s);
        const shown=after.filter(x=>!bumps.includes(x.id)||dd!==d); // bumped = skipped today, not applied
        const record=(sev,key,msg)=>{const k=`${sev} | ${msg.replace(/"[^"]*" \(([a-z_]+)\)/g,'$1').replace(/"[^"]*"/g,'…')}`;(issues[k]=issues[k]||[]).push(`${p.genericName.slice(0,24)} → ${dd}:${s}${j?' (next day)':''}`)};
        checkDay(get,`${dd}:${s}`,shown,record);
        if(j===0&&!after.some(x=>x.id===p.id))record('high','',`added step "${p.genericName}" is missing from the day`);
      });
    }
  }
}
const keys=Object.keys(issues).sort();
console.log(`${sims} simulated adds over ${DAYS} days in ${((Date.now()-t0)/1000).toFixed(1)}s — ${keys.length} distinct problems`);
keys.forEach(k=>console.log(`[${issues[k].length}×] ${k}\n      e.g. ${[...new Set(issues[k])].slice(0,3).join(' | ')}`));
process.exit(keys.some(k=>k.startsWith('high'))?1:0);
