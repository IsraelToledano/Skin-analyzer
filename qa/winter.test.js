// Winter 2026 (2026-10-29): fewer/gentler peels, tretinoin 3×/week, more hydration.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,2]);const type=get('detectType'),rr=get('rotationRoleFor'),add=get('addDaysStr'),ag=get('classifyActiveGroups'),sg=get('classifySingletonGroups');
const prof=seedProfile(get);const pl=plan(get,prof,56);const pm=Object.keys(pl).filter(k=>k.endsWith(':pm')).sort();
const M=()=>get('MIGRATIONS').find(m=>m.id==='winter_2026_v1');const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const strong=l=>l.some(p=>!/cleanser/.test(type(p))&&ag(p).some(g=>g==='retinoid'||g==='acid-exfoliant'));
console.log('library');
t('tretinoin is three times a week',()=>assert.strictEqual(by(/tretinoin/i).frequency,'three-weekly'));
t('OTC retinol and the strong acids are paused (kept in the library, marked winterPaused)',()=>{
  [/Retinol B3/,/One Step Peel/,/AHA 30%/,/Glycolic Acid 7%/,/30 Days Miracle/,/COSRX AHA\/BHA/].forEach(re=>{const p=by(re);assert.ok(p,String(re));assert.ok(!p.scheduled&&p.winterPaused,p.genericName);});});
t('the gentle exfoliants stay: Paula\'s Choice BHA, Microfoliant, Caudalie salicylic serum',()=>[/2% BHA/,/Microfoliant/,/Vinopure Blemish/].forEach(re=>assert.ok(by(re).scheduled,String(re))));
t('the VinoHydra cream mask is twice a week',()=>assert.strictEqual(by(/VinoHydra/).frequency,'twice-weekly'));
t('migration: idempotent, leaves unscheduled products alone, safe on empty',()=>{const once=M().apply({products:prof.products.map(p=>p.winterPaused?{...p,scheduled:true,winterPaused:undefined}:p)});
  assert.strictEqual(M().apply(once),once);const off={products:[{id:1,genericName:'One Step Peel',brandName:'SR',scheduled:false}]};assert.strictEqual(M().apply(off),off);const e={};assert.strictEqual(M().apply(e),e);});
console.log('8-week plan');
const nights=f=>pm.filter(k=>pl[k].some(f));
t('tretinoin about 3 nights a week (21-25 in 56)',()=>{const n=nights(p=>rr(p)==='tretinoin').length;assert.ok(n>=21&&n<=25,'tretinoin '+n);});
t('one exfoliant night a week (7-9 in 56), only gentle ones',()=>{const n=nights(p=>rr(p)==='exfoliant');assert.ok(n.length>=7&&n.length<=9,'exfoliant '+n.length);
  n.forEach(k=>pl[k].filter(p=>rr(p)==='exfoliant').forEach(p=>assert.ok(!p.winterPaused,p.genericName)));});
t('no retinol, no paused product, ever',()=>pm.forEach(k=>pl[k].forEach(p=>assert.ok(!p.winterPaused&&rr(p)!=='retinol',k+' '+p.genericName))));
t('at most 4 active evenings in any week, at least 2 rest evenings',()=>{for(let i=0;i+7<=pm.length;i+=7){const w=pm.slice(i,i+7);const a=w.filter(k=>strong(pl[k])).length;assert.ok(a<=4,w[0]+': '+a);}});
t('never two tretinoin nights in a row',()=>pm.forEach((k,i)=>{if(i&&pl[k].some(p=>rr(p)==='tretinoin'))assert.ok(!pl[pm[i-1]].some(p=>rr(p)==='tretinoin'),k);}));
t('a hydrating layer on nearly every night (≥ 85%)',()=>{const n=pm.filter(k=>pl[k].some(p=>sg(p).includes('layer:essence'))).length;assert.ok(n>=pm.length*0.85,`${n}/${pm.length}`);});
t('vitamin C stays about twice a week (14-18 mornings in 56)',()=>{const n=Object.keys(pl).filter(k=>k.endsWith(':am')&&pl[k].some(p=>type(p)==='vitc')).length;assert.ok(n>=14&&n<=18,'vit C '+n);});
t('the 56-day plan passes the routine audit with no high issues',()=>{const {issues}=require('./audit').audit(get,prof,pl,56);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.key+' '+i.msg),[]);});
t('the standard (summer) week is still there to switch back to',()=>{const P=get('ROTATION_PLANS');assert.ok(P.standard.filter(s=>s.role==='exfoliant').length===2&&P.standard.some(s=>s.role==='retinol'));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
