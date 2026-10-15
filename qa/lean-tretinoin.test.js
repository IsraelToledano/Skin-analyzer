// Tretinoin nights are lean (2026-10-15): no essence or leave-on hydrating
// mask that night; the toner, moisturizer and lip step stay.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
const get=load([2026,9,15]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const rr=get('rotationRoleFor'),sg=get('classifySingletonGroups'),type=get('detectType'),add=get('addDaysStr');
const prof=seedProfile(get);const pl=plan(get,prof,60);
const pm=Object.keys(pl).filter(k=>k.endsWith(':pm'));
const tret=pm.filter(k=>pl[k].some(p=>rr(p)==='tretinoin'));
const ess=p=>sg(p).includes('layer:essence');
t('his library has tretinoin nights to check (~2/week)',()=>assert.ok(tret.length>=14,'only '+tret.length));
t('no essence and no leave-on hydrating mask on a tretinoin night',()=>tret.forEach(k=>assert.ok(!pl[k].some(ess),k+': '+pl[k].map(p=>p.genericName).join(' > '))));
t('tretinoin nights keep cleanser and moisturizer',()=>tret.forEach(k=>['cleanser','moisturizer'].forEach(x=>assert.ok(pl[k].some(p=>type(p)===x),k+' missing '+x))));
t('every other night still gets one essence-slot step',()=>{const other=pm.filter(k=>!tret.includes(k));
  const filled=other.filter(k=>pl[k].some(ess)).length;assert.ok(filled>=other.length*0.9,`${filled}/${other.length}`);});
t('retinol (not tretinoin) nights are unchanged: the essence still runs',()=>{
  const ret=pm.filter(k=>pl[k].some(p=>rr(p)==='retinol'));assert.ok(ret.length>=4);
  assert.ok(ret.filter(k=>pl[k].some(ess)).length>=ret.length*0.75,'retinol nights lost the essence');});
t('ginseng still gets the biggest essence share',()=>{const c={};pm.forEach(k=>pl[k].filter(ess).forEach(p=>{const n=p.genericName+' '+(p.brandName||'');c[n]=(c[n]||0)+1}));
  const g=Object.entries(c).find(([n])=>/ginseng/i.test(n));assert.ok(g&&Object.values(c).every(v=>v<=g[1]),JSON.stringify(c));});
t('an essence added by hand on a tretinoin night stays',()=>{
  const k=tret[0];const d=k.split(':')[0];const g=prof.products.find(p=>/ginseng/i.test(p.genericName+' '+p.brandName));
  const pl2=plan(get,{...prof,pins:[{id:1,date:d,session:'pm',productId:g.id}]},10);assert.ok(pl2[k].some(p=>p.id===g.id),pl2[k].map(p=>p.genericName).join(' > '));});
t('a malformed product list does not throw',()=>{plan(get,{...prof,products:prof.products.concat([{id:99}])},7);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
