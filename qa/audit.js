// Audits a generated plan against skincare layering and scheduling rules.
// Every rule here is independent of the scheduler's own code paths, so a bug
// in the scheduler can't hide itself by also being in the checker.
const RINSE_OFF=p=>{
  const t=[p.genericName,p.brandName].join(' ').toLowerCase();
  return /cleans|face wash|foaming/.test(t)||/microfoliant|powder exfoliant/.test(t)
    ||/clay|pore mask|pore cleansing mask|instant d[eé]tox/.test(t)
    ||/peeling solution|gel peel/.test(t);
};
function checkDay(get,key,list,add){
  const type=p=>get('detectType')(p);
  const nameOf=p=>`${p.genericName}${p.brandName?' ('+p.brandName.split(' ').slice(0,3).join(' ')+')':''}`;
    const [d,session]=key.split(':');
    const types=list.map(type);
    const skin=list.filter(p=>type(p)!=='lip');
    if(!list.length){add('high',key,'empty session');return;}
    // R1 cleanser first; oil cleanse followed by a water cleanse
    if(!['cleanser','cleanser_oil'].includes(types[0]))add('high',key,`first step is ${types[0]}, not a cleanser`);
    const oi=types.indexOf('cleanser_oil');
    if(oi>=0&&types[oi+1]!=='cleanser')add('high',key,'oil cleanse not followed by a water cleanse');
    // R2 rinse-off steps all precede every leave-on step
    const lastRinse=list.map(RINSE_OFF).lastIndexOf(true);
    const firstLeave=list.findIndex(p=>!RINSE_OFF(p));
    if(lastRinse>firstLeave&&firstLeave>=0)add('high',key,`rinse-off "${nameOf(list[lastRinse])}" comes after leave-on "${nameOf(list[firstLeave])}" — it would wash it off`);
    // R3 SPF: every morning, last; never at night
    if(session==='am'){if(!types.includes('spf'))add('high',key,'no sunscreen');else if(types[types.length-1]!=='spf')add('high',key,'sunscreen is not the last step');}
    if(session==='pm'&&types.includes('spf'))add('high',key,'sunscreen at night');
    // R4 moisturizer every session
    if(!types.includes('moisturizer'))add('med',key,'no moisturizer');
    // R5 layering order (leave-on part): toner < essence < treatments < eye < mask < oil < moisturizer < lip < spf
    const rank={exfoliant:0.5,toner:1,mist:1,essence:2,vitc:3,niacinamide:3,retinoid:3,serum:3.5,eye:4,mask:5,faceoil:6,moisturizer:7,selftan:7.5,lip:8,spf:9};
    const leave=list.filter(p=>!RINSE_OFF(p));
    for(let i=1;i<leave.length;i++){const a=rank[type(leave[i-1])]??3.5,b=rank[type(leave[i])]??3.5;if(a>b)add('high',key,`"${nameOf(leave[i])}" (${type(leave[i])}) after "${nameOf(leave[i-1])}" (${type(leave[i-1])})`);}
    // R6 conflicts on the skin at the same time (leave-on only, plus acid wash + retinoid)
    const has=g=>list.some(p=>get('conflictGroupsFor')(p).includes(g));
    const leaveHas=g=>leave.some(p=>get('conflictGroupsFor')(p).includes(g));
    if(has('retinoid')&&has('acid-exfoliant'))add('high',key,'retinoid and acid in the same session');
    if(has('retinoid')&&has('vitamin-c'))add('high',key,'retinoid and vitamin C in the same session');
    const others=list.filter(p=>type(p)!=='selftan');const oHas=g=>others.some(p=>get('conflictGroupsFor')(p).includes(g));
    if(types.includes('selftan')&&(oHas('retinoid')||oHas('acid-exfoliant')||oHas('vitamin-c')))add('high',key,'self-tan with an active');
    if(leaveHas('vitamin-c')&&leaveHas('niacinamide'))add('med',key,'vitamin C and niacinamide together');
    // R7 duplicates
    const dup=(t,label)=>{if(types.filter(x=>x===t).length>1)add('med',key,`two ${label}`)};
    dup('cleanser','water cleansers');dup('toner','toners');dup('essence','essences');dup('moisturizer','moisturizers');dup('retinoid','retinoids');dup('spf','sunscreens');dup('mask','masks');
    if(leave.filter(p=>get('conflictGroupsFor')(p).includes('acid-exfoliant')).length>1)add('high',key,'two leave-on acids');
    // R8 cap (skin steps)
    if(skin.length>get('SESSION_CAP'))add('med',key,`${skin.length} skin steps (cap ${get('SESSION_CAP')})`);
      // R11 a wash-off clay mask night carries no retinoid or leave-on acid:
    // clay is drying and the mask night is meant to be the barrier's break.
    const clay=list.some(p=>type(p)==='mask'&&RINSE_OFF(p));
    if(clay&&leave.some(p=>get('conflictGroupsFor')(p).some(g=>g==='retinoid'||g==='acid-exfoliant')))add('high',key,'clay mask on the same night as a retinoid or leave-on acid');
}
function audit(get,profile,planObj,days){
  const type=p=>get('detectType')(p);
  const issues=[];const add=(sev,key,msg)=>issues.push({sev,key,msg});
  const counts={};
  const nameOf=p=>`${p.genericName}${p.brandName?' ('+p.brandName.split(' ').slice(0,3).join(' ')+')':''}`;
  Object.entries(planObj).forEach(([key,list])=>{
    const session=key.split(':')[1];
    list.forEach(p=>{counts[p.id]=counts[p.id]||{am:0,pm:0};counts[p.id][session]++;});
    checkDay(get,key,list,add);
  });
  // R9 frequency adherence
  const expected={daily:days,'twice-weekly':days*2/7,weekly:days/7,'bi-weekly':days/14,monthly:days/30};
  const role=p=>get('rotationRoleFor')(p);
  const layer=p=>get('classifySingletonGroups')(p).find(g=>g.startsWith('layer:'));
  const scheduled=profile.products.filter(p=>p.scheduled);
  const info=[];
  // a) weekly rotation pools: total nights per pool, and every member gets a turn
  const slotsPerWeek={exfoliant:2,tretinoin:2,retinol:1,mask:1};
  Object.entries(slotsPerWeek).forEach(([r,perWeek])=>{
    const members=scheduled.filter(p=>role(p)===r);if(!members.length)return;
    const total=members.reduce((n,p)=>n+((counts[p.id]||{}).pm||0),0);const exp=days/7*perWeek;
    info.push(`pool ${r}: ${total} nights (slots ~${Math.round(exp)}): `+members.map(p=>`${p.genericName.slice(0,18)} ${(counts[p.id]||{}).pm||0}`).join(', '));
    if(total<exp*0.7)add('med','freq:pool',`${r} rotation ran ${total} nights in ${days}, slots allow ~${Math.round(exp)}`);
    if(days>=56)members.forEach(p=>{if(!((counts[p.id]||{}).pm))add('high','freq:pool',`"${nameOf(p)}" never gets a ${r} night in ${days} days`)});
  });
  // b) daily products sharing a one-per-session slot: the slot is filled, members take fair turns
  ['am','pm'].forEach(s=>{
    const groups={};
    scheduled.filter(p=>!role(p)&&p.frequency==='daily'&&(p.session===s||p.session==='both')&&layer(p)).forEach(p=>{(groups[layer(p)]=groups[layer(p)]||[]).push(p)});
    Object.entries(groups).filter(([,m])=>m.length>1).forEach(([g,m])=>{
      const c=m.map(p=>(counts[p.id]||{})[s]||0);const tot=c.reduce((a,b)=>a+b,0);
      info.push(`${s.toUpperCase()} ${g}: ${m.map((p,i)=>`${p.genericName.slice(0,18)} ${c[i]}`).join(', ')}`);
      if(tot<days*0.9)add('med',`freq:${s}`,`${g} slot filled only ${tot}/${days} ${s.toUpperCase()}s`);
      if(Math.max(...c)-Math.min(...c)>Math.max(3,tot/m.length*0.35))add('med',`freq:${s}`,`${g} alternation uneven: ${c.join('/')}`);
    });
  });
  // c) everything else: its own frequency
  scheduled.forEach(p=>{
    const c=counts[p.id]||{am:0,pm:0};
    const sessions=p.session==='both'?['am','pm']:[p.session];
    sessions.forEach(s=>{
      if(role(p))return;
      const l=layer(p);const shared=l&&p.frequency==='daily'&&scheduled.some(o=>o!==p&&!role(o)&&o.frequency==='daily'&&layer(o)===l&&(o.session===s||o.session==='both'));
      if(shared)return;
      const exp=expected[p.frequency];if(!exp)return;
      const got=c[s]||0;
      if(got===0)add('high',`freq:${s}`,`"${nameOf(p)}" never appears in ${s.toUpperCase()} (${p.frequency})`);
      else if(got<exp*0.6)add(p.frequency==='daily'?'info':'med',`freq:${s}`,`"${nameOf(p)}" ${got}× in ${days} ${s.toUpperCase()}s, expected ~${Math.round(exp)} (${p.frequency})`);
      else if(got>exp*1.6+1)add('med',`freq:${s}`,`"${nameOf(p)}" ${got}× in ${days} ${s.toUpperCase()}s, expected ~${Math.round(exp)} (${p.frequency})`);
    });
    ['am','pm'].forEach(s=>{if(!sessions.includes(s)&&(c[s]||0)>0)add('high',`freq:${s}`,`"${nameOf(p)}" appears in ${s.toUpperCase()} but is scheduled ${p.session}`)});
  });
  // R10 leave-on active nights back to back (info)
  const keys=Object.keys(planObj).filter(k=>k.endsWith(':pm')).sort();
  let b2b=0;for(let i=1;i<keys.length;i++){const act=k=>planObj[k].some(p=>!RINSE_OFF(p)&&get('conflictGroupsFor')(p).some(g=>g==='retinoid'||g==='acid-exfoliant'));if(act(keys[i])&&act(keys[i-1]))b2b++;}
  return {issues,counts,b2b,info};
}
module.exports={audit,checkDay,RINSE_OFF};
