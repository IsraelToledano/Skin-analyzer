// Simulates "+ Add step" for every product in the library, on every day and
// session for the next N days, through the app's own add path (a pin that
// carries computeAddStepBumps' bumps), rebuilds the schedule, and checks the
// resulting day and the 7 days after it, which reflow around the add (and
// never run another same-role rotation step the very next night).
const {load,seedProfile}=require('./sim');const {checkDay}=require('./audit');
const DAYS=+(process.argv.find(a=>/^--days=/.test(a))||'--days=60').split('=')[1];
const get=load();const base=seedProfile(get);
const T=get('todayStr')();const add=get('addDaysStr');
const build=(prof,toDs,session)=>get('buildSessionSchedule')(prof.products,prof.logs||[],session,get('computeEpoch')(prof.products,session),toDs,get('SESSION_CAP'),prof.pins||[],prof.procedures||[]);
const dayList=(prof,sched,d,session)=>get('sortForDay')(get('queueFor')(sched,prof.products,get('parseDate')(d)),prof,d,session);
const fits=(p,s)=>{const sess=p.scheduled?p.session:get('suggestSchedule')(p).session;return sess===s||sess==='both';};
const issues={};let sims=0;const t0=Date.now();
const full={am:build(base,add(T,DAYS+7),'am'),pm:build(base,add(T,DAYS+7),'pm')};
for(let i=0;i<DAYS;i++){
  const d=add(T,i);
  for(const s of ['am','pm']){
    const list=dayList(base,full[s],d,s);
    const candidates=base.products.filter(p=>!list.some(x=>x.id===p.id)&&fits(p,s));
    for(const p of candidates){
      sims++;
      const bumps=get('computeAddStepBumps')(p,'add',null,list,{session:s,ds:d,profile:base});
      const prof={...base,pins:[...(base.pins||[]),{id:1,date:d,session:s,productId:p.id,bumps}]};
      const sched=build(prof,add(d,7),s);
      const record=(dd,j)=>(sev,key,msg)=>{const k=`${sev} | ${msg.replace(/"[^"]*" \(([a-z_]+)\)/g,'$1').replace(/"[^"]*"/g,'…')}`;(issues[k]=issues[k]||[]).push(`${p.genericName.slice(0,24)} → ${dd}:${s}${j?` (+${j}d)`:''}`)};
      const after=dayList(prof,sched,d,s);
      checkDay(get,`${d}:${s}`,after,record(d,0));
      if(!after.some(x=>x.id===p.id))record(d,0)('high','',`added step "${p.genericName}" is missing from the day`);
      bumps.forEach(id=>{if(after.some(x=>x.id===id))record(d,0)('high','',`bumped step is still on the day`)});
      const role=get('rotationRoleFor')(p);
      for(let j=1;j<=7;j++){
        const dd=add(d,j);const day=dayList(prof,sched,dd,s);
        checkDay(get,`${dd}:${s}`,day,record(dd,j));
        if(j===1&&role&&day.some(x=>get('rotationRoleFor')(x)===role))record(dd,j)('high','',`another ${role} the night after an added one`);
      }
    }
  }
}
const keys=Object.keys(issues).sort();
console.log(`${sims} simulated adds over ${DAYS} days in ${((Date.now()-t0)/1000).toFixed(1)}s — ${keys.length} distinct problems`);
keys.forEach(k=>console.log(`[${issues[k].length}×] ${k}\n      e.g. ${[...new Set(issues[k])].slice(0,3).join(' | ')}`));
process.exit(keys.some(k=>k.startsWith('high'))?1:0);
