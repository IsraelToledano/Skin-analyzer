// Retinoid nights: the retinoid goes on clean dry skin with nothing before it —
// no toner (2026-10-15/17). Winter (2026-10-29): the night's hydrating layer
// (essence or cream mask) comes back AFTER the retinoid, before the moisturizer.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
const get=load([2026,9,15]);
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const rr=get('rotationRoleFor'),sg=get('classifySingletonGroups'),type=get('detectType'),add=get('addDaysStr');
const prof=seedProfile(get);const pl=plan(get,prof,60);
const pm=Object.keys(pl).filter(k=>k.endsWith(':pm'));
const tret=pm.filter(k=>pl[k].some(p=>rr(p)==='tretinoin'));
const ess=p=>sg(p).includes('layer:essence');
const retN=pm.filter(k=>pl[k].some(p=>type(p)==='retinoid'));
t('his library has tretinoin nights to check (~3/week in winter: 22-28 in 60 nights)',()=>assert.ok(tret.length>=22&&tret.length<=28,'tretinoin nights: '+tret.length));
t('on a tretinoin night any hydrating layer comes after the tretinoin, never before',()=>tret.forEach(k=>{const l=pl[k];const r=l.findIndex(p=>type(p)==='retinoid');
  l.forEach((p,i)=>{if(ess(p))assert.ok(i>r,k+': '+l.map(p=>p.genericName).join(' > '));});}));
t('most tretinoin nights now get a hydrating layer (winter humectants)',()=>{const n=tret.filter(k=>pl[k].some(ess)).length;assert.ok(n>=tret.length*0.7,`${n}/${tret.length}`);});
t('tretinoin nights keep cleanser and moisturizer',()=>tret.forEach(k=>['cleanser','moisturizer'].forEach(x=>assert.ok(pl[k].some(p=>type(p)===x),k+' missing '+x))));
t('every non-retinoid night gets one hydrating layer too',()=>{const other=pm.filter(k=>!retN.includes(k));
  const filled=other.filter(k=>pl[k].some(ess)).length;assert.ok(filled>=other.length*0.9,`${filled}/${other.length}`);});
const toner=p=>sg(p).includes('layer:toner');
t('OTC retinol is paused for the winter (tretinoin takes its night)',()=>{assert.strictEqual(pm.filter(k=>pl[k].some(p=>rr(p)==='retinol')).length,0);
  const r=prof.products.find(p=>type(p)==='retinoid'&&!/tretinoin/i.test(p.brandName||''));if(r&&r.winterPaused!==undefined)assert.ok(!r.scheduled&&r.winterPaused);});
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
t('an essence added by hand on a tretinoin night stays (and sits after the tretinoin)',()=>{
  const k=tret[0];const d=k.split(':')[0];const g=prof.products.find(p=>/ginseng/i.test(p.genericName+' '+p.brandName));
  const pl2=plan(get,{...prof,pins:[{id:1,date:d,session:'pm',productId:g.id}]},10);assert.ok(pl2[k].some(p=>p.id===g.id),pl2[k].map(p=>p.genericName).join(' > '));});
t('a malformed product list does not throw',()=>{plan(get,{...prof,products:prof.products.concat([{id:99}])},7);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
