// Random skip patterns (2026-10-22, after the triple-cleanser bug): however
// steps are skipped, no session ever ends up with two products from the same
// one-per-session slot or two clashing actives — unless one was added by hand
// or already ticked. Runs on his library, AM and PM, 120 random patterns.
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load([2026,9,22]);
const add=get('addDaysStr'),sg=get('classifySingletonGroups'),conf=get('productsConflict');
const seed=seedProfile(get);const start='2026-09-15',to='2026-11-30',skipFrom='2026-09-20',skipTo='2026-11-15';
const prods=seed.products.map(p=>p.nextDate?{...p,nextDate:start}:p);const byId=new Map(prods.map(p=>[p.id,p]));
let r=12345;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};
const TRIALS=+(process.argv[2]||60);let problems=[],checked=0;
const t0=Date.now();
for(let tr=0;tr<TRIALS;tr++)for(const session of ['am','pm']){
  const base=get('buildSessionSchedule')(prods,[],session,start,to,get('SESSION_CAP'),[],[]);
  const logs=[];
  for(let d=skipFrom;d<=skipTo;d=add(d,1))if(rnd()<0.45)(base[d]||[]).forEach(e=>{if(rnd()<0.5)logs.push({id:logs.length,date:d,productId:e.productId,session,done:false,skipped:true});});
  const s=get('buildSessionSchedule')(prods,logs,session,start,to,get('SESSION_CAP'),[],[]);
  for(let d=skipFrom;d<=to;d=add(d,1)){checked++;
    const ps=(s[d]||[]).filter(e=>!e.pinned&&!e.logged).map(e=>byId.get(e.productId)).filter(Boolean);
    const seen={};ps.forEach(p=>sg(p).forEach(g=>(seen[g]=seen[g]||[]).push(p.genericName)));
    Object.entries(seen).forEach(([g,n])=>{if(n.length>1)problems.push(`${d} ${session} ${g}: ${n.join(' + ')}`)});
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(conf(ps[i],ps[j]))problems.push(`${d} ${session} clash: ${ps[i].genericName} + ${ps[j].genericName}`);
  }
}
const u=[...new Set(problems)];
console.log(`  ${TRIALS} random skip patterns x AM/PM, ${checked} sessions checked in ${((Date.now()-t0)/1000).toFixed(1)}s`);
if(u.length){console.log('  FAIL',u.length,'distinct problems');u.slice(0,10).forEach(x=>console.log('       ',x));process.exit(1);}
console.log('  ok   no doubled slot and no clashing actives in any session');
