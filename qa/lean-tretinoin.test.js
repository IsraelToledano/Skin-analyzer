// Retinoid nights are lean: no essence or leave-on hydrating mask (tretinoin,
// 2026-10-15) and no toner either, for every retinoid (2026-10-17) — the
// retinoid goes on clean dry skin; moisturizer and lip stay.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
const get=load([2026,9,15]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const rr=get('rotationRoleFor'),sg=get('classifySingletonGroups'),type=get('detectType'),add=get('addDaysStr');
const prof=seedProfile(get);const pl=plan(get,prof,60);
const pm=Object.keys(pl).filter(k=>k.endsWith(':pm'));
const tret=pm.filter(k=>pl[k].some(p=>rr(p)==='tretinoin'));
const ess=p=>sg(p).includes('layer:essence');
const retN=pm.filter(k=>pl[k].some(p=>type(p)==='retinoid'));
t('his library has tretinoin nights to check (~2/week)',()=>assert.ok(tret.length>=14,'only '+tret.length));
t('no essence and no leave-on hydrating mask on a tretinoin night',()=>tret.forEach(k=>assert.ok(!pl[k].some(ess),k+': '+pl[k].map(p=>p.genericName).join(' > '))));
t('tretinoin nights keep cleanser and moisturizer',()=>tret.forEach(k=>['cleanser','moisturizer'].forEach(x=>assert.ok(pl[k].some(p=>type(p)===x),k+' missing '+x))));
t('every non-retinoid night still gets one essence-slot step',()=>{const other=pm.filter(k=>!retN.includes(k));
  const filled=other.filter(k=>pl[k].some(ess)).length;assert.ok(filled>=other.length*0.9,`${filled}/${other.length}`);});
const toner=p=>sg(p).includes('layer:toner');
t('retinol nights are lean too: no toner and no essence',()=>{
  const ret=pm.filter(k=>pl[k].some(p=>rr(p)==='retinol'));assert.ok(ret.length>=4,'only '+ret.length);
  ret.forEach(k=>assert.ok(!pl[k].some(p=>ess(p)||toner(p)),k+': '+pl[k].map(p=>p.genericName).join(' > ')));});
t('no toner on any retinoid night; the retinoid comes right after the cleanser',()=>retN.forEach(k=>{
  assert.ok(!pl[k].some(toner),k);const i=pl[k].findIndex(p=>type(p)==='retinoid');
  assert.ok(pl[k].slice(0,i).every(p=>/cleanser/.test(type(p))),k+': '+pl[k].map(p=>p.genericName).join(' > '));}));
t('non-retinoid nights keep the toner',()=>{const tonerP=prof.products.find(toner);if(!tonerP||!/pm|both/.test(tonerP.session))return;
  const other=pm.filter(k=>!retN.includes(k));assert.ok(other.filter(k=>pl[k].some(toner)).length>=other.length*0.8);});
t('a toner skipped the night before a retinoid night moves on, it does not land before the retinoid',()=>{
  const k=retN.find(k=>pl[add(k.split(':')[0],-1)+':pm']);const d=k.split(':')[0],prev=add(d,-1);
  const T=prof.products.find(toner);const pl2=plan(get,{...prof,logs:[{id:1,date:prev,session:'pm',productId:T.id,done:false,skipped:true}]},12);
  assert.ok(!pl2[k].some(p=>p.id===T.id),pl2[k].map(p=>p.genericName).join(' > '));});
t('a toner added by hand on a retinoid night stays',()=>{const k=retN[0];const d=k.split(':')[0];const T=prof.products.find(toner);
  const pl2=plan(get,{...prof,pins:[{id:2,date:d,session:'pm',productId:T.id}]},10);assert.ok(pl2[k].some(p=>p.id===T.id));});
t('ginseng still gets the biggest essence share',()=>{const c={};pm.forEach(k=>pl[k].filter(ess).forEach(p=>{const n=p.genericName+' '+(p.brandName||'');c[n]=(c[n]||0)+1}));
  const g=Object.entries(c).find(([n])=>/ginseng/i.test(n));assert.ok(g&&Object.values(c).every(v=>v<=g[1]),JSON.stringify(c));});
t('an essence added by hand on a tretinoin night stays',()=>{
  const k=tret[0];const d=k.split(':')[0];const g=prof.products.find(p=>/ginseng/i.test(p.genericName+' '+p.brandName));
  const pl2=plan(get,{...prof,pins:[{id:1,date:d,session:'pm',productId:g.id}]},10);assert.ok(pl2[k].some(p=>p.id===g.id),pl2[k].map(p=>p.genericName).join(' > '));});
t('a malformed product list does not throw',()=>{plan(get,{...prof,products:prof.products.concat([{id:99}])},7);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
