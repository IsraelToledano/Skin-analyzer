const {load,seedProfile,plan}=require('./sim');const {audit}=require('./audit');
let bad=0;
const starts=[[2026,9,1],[2026,9,3],[2026,9,6],[2026,9,11],[2026,9,17],[2026,9,24],[2026,10,2],[2026,10,15],[2026,11,20],[2027,0,5]];
for(const st of starts){
  const get=load(st);const prof=seedProfile(get);
  const scenarios={plain:prof};
  const d0=get('todayStr')();
  scenarios.microneedling={...prof,procedures:[{date:get('addDaysStr')(d0,2),type:'microneedling'},{date:get('addDaysStr')(d0,16),type:'microneedling'}]};
  // skip a few evening steps along the way (skips carry a step to the next day)
  const pl0=plan(get,prof,30);const skipLogs=[];
  Object.keys(pl0).filter(k=>k.endsWith(':pm')).sort().filter((k,i)=>i%5===0).forEach(k=>{const p=pl0[k][2];if(p)skipLogs.push({id:Math.random(),date:k.split(':')[0],session:'pm',productId:p.id,done:false,skipped:true})});
  scenarios.skips={...prof,logs:skipLogs};
  for(const [name,pr] of Object.entries(scenarios)){
    const pl=plan(get,pr,30);const {issues}=audit(get,pr,pl,30);
    // A blocked active night is dropped for that week, by design (no make-up
    // night) — so pool totals are expected to dip in the microneedling run.
    const real=issues.filter(i=>i.sev!=='info'&&!(name==='microneedling'&&i.key==='freq:pool'));
    if(name==='microneedling'){
      // actives must be held back on the needling night and the next
      pr.procedures.forEach(x=>[0,1].forEach(o=>{const k=get('addDaysStr')(x.date,o)+':pm';(pl[k]||[]).forEach(p=>{const g=get('conflictGroupsFor')(p);if(!get('isRinseOffProduct')(p)&&(g.includes('retinoid')||g.includes('acid-exfoliant')))real.push({sev:'high',key:k,msg:`active "${p.genericName}" during microneedling recovery`})})}));
    }
    if(real.length){bad+=real.length;console.log(`${st.join('-')} ${name}: ${real.length} issues`);real.slice(0,4).forEach(i=>console.log('   ',i.sev,i.key,i.msg))}
  }
}
console.log(bad?`\n${bad} issues across the sweep`:`\nclean: ${starts.length} start dates × 3 scenarios × 30 days`);process.exit(bad?1:0);
