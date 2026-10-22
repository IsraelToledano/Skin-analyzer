// Two skipped groups carried into the same night don't stack (2026-10-22:
// skipping the oil cleanse (linked to the Caudalie gel) and the Anua gel on
// one night carried three cleansers into the next night).
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load([2026,9,22]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const type=get('detectType'),add=get('addDaysStr');
const seed=seedProfile(get);const start='2026-09-01',end='2026-11-30';
const prods=seed.products.map(p=>p.nextDate?{...p,nextDate:start}:p);const byId=new Map(prods.map(p=>[p.id,p]));
const sched=logs=>get('buildSessionSchedule')(prods,logs,'pm',start,end,get('SESSION_CAP'),[],[]);
const ids=(s,d)=>(s[d]||[]).map(e=>e.productId);
const gels=(s,d)=>ids(s,d).filter(id=>type(byId.get(id))==='cleanser');
const L=(date,id)=>({id:Math.random(),date,productId:id,session:'pm',done:false,skipped:true});
const oil=prods.find(p=>type(p)==='cleanser_oil');
const base=sched([]);
// nights where the oil cleanse runs with a gel cleanser outside its own pair
const days=Object.keys(base).filter(d=>d<'2026-11-20'&&ids(base,d).includes(oil.id)&&gels(base,d).some(id=>!(oil.linkGroup&&byId.get(id).linkGroup===oil.linkGroup)));
t('fixture: some nights pair the oil cleanse with a gel from outside its link group',()=>assert.ok(days.length>=2,days.join(' ')));
t('skipping both cleanses: the next night has exactly one gel cleanser',()=>days.forEach(D=>{
  const s=sched(ids(base,D).filter(id=>/cleanser/.test(type(byId.get(id)))).map(id=>L(D,id)));const n=add(D,1);
  assert.strictEqual(gels(s,n).length,1,n+': '+ids(s,n).join(','));}));
t('the deferred cleanser still comes back within two nights',()=>{const D=days[0];
  const skipped=ids(base,D).filter(id=>/cleanser/.test(type(byId.get(id))));const s=sched(skipped.map(id=>L(D,id)));
  skipped.forEach(id=>assert.ok([1,2,3].some(k=>ids(s,add(D,k)).includes(id)),id));});
t('repeated double skips never give a night two gel cleansers',()=>{
  const logs=[];days.forEach(D=>ids(base,D).filter(id=>/cleanser/.test(type(byId.get(id)))).forEach(id=>logs.push(L(D,id))));
  const s=sched(logs);Object.keys(s).forEach(d=>assert.ok(gels(s,d).length<=1,d+': '+ids(s,d).join(',')));});
t('a carried lip mask and a carried cleanser both land (no false clash)',()=>{const D=days[0];const lip=prods.find(p=>type(p)==='lip');
  const s=sched([L(D,oil.id),L(D,lip.id)]);const n=add(D,1);assert.ok(ids(s,n).includes(lip.id)&&ids(s,n).includes(oil.id),ids(s,n).join(','));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
