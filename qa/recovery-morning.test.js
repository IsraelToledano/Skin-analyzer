// Recovery morning (2026-10-25): after an evening with a retinoid or an
// exfoliant, the next morning has no vitamin C, acid (acid cleanser too),
// retinoid or benzoyl; a gentle cleanser stands in. Updates as soon as a
// step is added to the evening.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
const get=load([2026,9,25]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const type=get('detectType'),add=get('addDaysStr'),cg=get('conflictGroupsFor'),ag=get('classifyActiveGroups');
const today=get('todayStr')();
const seed=seedProfile(get);const start=add(today,-10);
const prof={...seed,products:seed.products.map(p=>p.nextDate?{...p,nextDate:start}:p)};
const f=re=>prof.products.find(p=>p.scheduled!==false&&re.test(p.genericName+' '+(p.brandName||'')));
const micro=f(/microfoliant/i),vitc=f(/vitamin c serum/i),sa=f(/exfoliating sa cleanser/i),tret=f(/tretinoin/i),vino=f(/vinohydra/i);
const bad=p=>cg(p).some(g=>['vitamin-c','acid-exfoliant','retinoid','benzoyl'].includes(g));
const strongPm=l=>l.some(p=>!/cleanser/.test(type(p))&&ag(p).some(g=>g==='retinoid'||g==='acid-exfoliant'));
const P=(date,session,productId)=>({id:Math.random(),date,session,productId});
const pl=plan(get,prof,42);const amKeys=Object.keys(pl).filter(k=>k.endsWith(':am')).sort();
t('fixture: Microfoliant, vitamin C, the acid cleanser and tretinoin exist',()=>assert.ok(micro&&vitc&&sa&&tret));
t('42-day plan: no vitamin C / acid / retinoid the morning after a retinoid or exfoliant evening',()=>amKeys.forEach(k=>{
  const prev=pl[add(k.split(':')[0],-1)+':pm'];if(!prev||!strongPm(prev))return;
  assert.ok(!pl[k].some(bad),k+': '+pl[k].map(p=>p.genericName).join(' > '));}));
t('every recovery morning still has a cleanser first, a moisturizer and SPF',()=>amKeys.forEach(k=>{
  const l=pl[k];assert.ok(/cleanser/.test(type(l[0])),k);assert.ok(l.some(p=>type(p)==='moisturizer')&&type(l[l.length-1])==='spf',k);}));
t('the stand-in cleanser is a gentle one (no acids) and is marked as a recovery swap',()=>amKeys.forEach(k=>{
  const prev=pl[add(k.split(':')[0],-1)+':pm'];if(!prev||!strongPm(prev))return;const c=pl[k][0];
  assert.strictEqual(ag(c).length,0,k+' '+c.genericName);if(c.session==='pm')assert.ok(c.recovery,k);}));
t('vitamin C still gets about two mornings a week (6-10 in 28 days) and they are free mornings',()=>{
  const ks=amKeys.slice(0,28).filter(k=>pl[k].some(p=>p.id===vitc.id));assert.ok(ks.length>=6&&ks.length<=10,'vit C mornings: '+ks.length);});
t('the acid cleanser still runs on free mornings',()=>{
  const free=amKeys.filter(k=>{const prev=pl[add(k.split(':')[0],-1)+':pm'];return prev&&!strongPm(prev);});
  assert.ok(free.length>=4);assert.ok(free.filter(k=>pl[k].some(p=>p.id===sa.id)).length>=free.length*0.6);});
// adding a step to an evening updates the next morning right away
const freeK=amKeys.find(k=>pl[k].some(p=>p.id===vitc.id));const freeD=freeK.split(':')[0],prevD=add(freeD,-1);
t('adding Microfoliant to the evening before a vitamin C morning takes the vitamin C (and acid wash) out of that morning',()=>{
  const p2=plan(get,{...prof,pins:[P(prevD,'pm',micro.id)]},42);
  assert.ok(p2[prevD+':pm'].some(p=>p.id===micro.id));assert.ok(!p2[freeK].some(bad),p2[freeK].map(p=>p.genericName).join(' > '));});
t('the vitamin C it moved comes back on the next free morning',()=>{
  const p2=plan(get,{...prof,pins:[P(prevD,'pm',micro.id)]},42);
  const next=amKeys.filter(k=>k>freeK).find(k=>p2[k].some(p=>p.id===vitc.id));assert.ok(next&&next<=add(freeD,6)+':am',String(next));});
t('vitamin C he adds himself on a recovery morning stays',()=>{
  const k=amKeys.find(k=>{const prev=pl[add(k.split(':')[0],-1)+':pm'];return prev&&strongPm(prev);});
  const p2=plan(get,{...prof,pins:[P(k.split(':')[0],'am',vitc.id)]},42);assert.ok(p2[k].some(p=>p.id===vitc.id));});
t('an exfoliant skipped last night does not make a recovery morning',()=>{
  const k=amKeys.find(k=>{const prev=pl[add(k.split(':')[0],-1)+':pm'];return prev&&strongPm(prev)&&prev.filter(p=>!/cleanser/.test(type(p))&&ag(p).length).length===1;});
  const d=k.split(':')[0],pd=add(d,-1);const act=pl[pd+':pm'].find(p=>!/cleanser/.test(type(p))&&ag(p).length);
  const p2=plan(get,{...prof,logs:[{id:1,date:pd,session:'pm',productId:act.id,done:false,skipped:true}]},42);
  assert.ok(p2[k].some(p=>p.id===sa.id),p2[k].map(p=>p.genericName).join(' > '));});
t('an evening with only a hydrating mask is not a recovery evening',()=>{
  const k=amKeys.find(k=>{const prev=pl[add(k.split(':')[0],-1)+':pm'];return prev&&prev.some(p=>p.id===vino.id)&&!strongPm(prev);});
  if(!k)return;assert.ok(pl[k].some(p=>p.id===sa.id));});
t('with no gentle cleanser in the library, the acid cleanser stays rather than leaving the morning unwashed',()=>{
  const lib={...prof,products:prof.products.filter(p=>!(/cleanser/.test(type(p))&&p.id!==sa.id&&ag(p).length===0))};
  const p2=plan(get,lib,21);Object.keys(p2).filter(k=>k.endsWith(':am')).forEach(k=>assert.ok(/cleanser/.test(type(p2[k][0])),k));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
