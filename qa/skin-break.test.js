// Skin break (2026-10-29): "my skin feels irritated" → two gentle days, morning
// and evening: no retinoids, acids (acid wash too), vitamin C, clay masks or
// fragranced products; a gentle cleanser in the mornings.
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,9,29]);const add=get('addDaysStr'),type=get('detectType'),cg=get('conflictGroupsFor'),wash=get('isWashOffMask');
const today=get('todayStr')();
const seed=seedProfile(get);const start=add(today,-10);
const base={...seed,products:seed.products.map(p=>p.nextDate?{...p,nextDate:start}:p),procedures:(seed.procedures||[]).filter(x=>x.type!=='irritation')};
const withBreak={...base,procedures:[...base.procedures,{date:today,type:'irritation'}]};
const harsh=p=>cg(p).some(g=>['retinoid','acid-exfoliant','vitamin-c','benzoyl'].includes(g))||wash(p)||p.fragranced;
const pl=plan(get,withBreak,10),pl0=plan(get,base,10);
const bdays=[today,add(today,1)];
t('fixture: without a break, those two days have actives',()=>assert.ok(bdays.some(d=>['am','pm'].some(s=>pl0[d+':'+s].some(harsh)))));
t('during the break: nothing harsh, morning or evening',()=>bdays.forEach(d=>['am','pm'].forEach(s=>assert.ok(!pl[d+':'+s].some(harsh),d+s+': '+pl[d+':'+s].filter(harsh).map(p=>p.genericName)))));
t('during the break every session still starts with a cleanser and has a moisturizer; mornings end with SPF',()=>bdays.forEach(d=>['am','pm'].forEach(s=>{const l=pl[d+':'+s];
  assert.ok(/cleanser/.test(type(l[0])),d+s);assert.ok(l.some(p=>type(p)==='moisturizer'),d+s);if(s==='am')assert.strictEqual(type(l[l.length-1]),'spf');})));
t('an oil cleanse during the break is followed by the gentle cleanser, not the fragranced one',()=>bdays.forEach(d=>{const l=pl[d+':pm'];const i=l.findIndex(p=>type(p)==='cleanser_oil');
  if(i>=0)assert.ok(type(l[i+1])==='cleanser'&&!l[i+1].fragranced,d);}));
t('actives come back within two days after the break',()=>{const after=[add(today,2),add(today,3)];assert.ok(after.some(d=>['am','pm'].some(s=>pl[d+':'+s].some(p=>cg(p).some(g=>g==='retinoid'||g==='vitamin-c')))));});
t('a step he adds himself during the break stays',()=>{const vc=base.products.find(p=>/vitamin c serum/i.test(p.genericName));
  const p2=plan(get,{...withBreak,pins:[{id:1,date:today,session:'am',productId:vc.id}]},3);assert.ok(p2[today+':am'].some(p=>p.id===vc.id));});
t('adding an active during the break warns, naming the break',()=>{const R=get('addStepIrritationRisks');const tret=base.products.find(p=>/tretinoin/i.test(p.brandName||''));const vc=base.products.find(p=>/vitamin c serum/i.test(p.genericName));
  const r1=R(withBreak,tret,add(today,1),'pm'),r2=R(withBreak,vc,today,'am');
  assert.ok(r1.some(x=>/marked your skin as irritated today/.test(x.text)),JSON.stringify(r1));assert.ok(r2.some(x=>/irritated/.test(x.text)));
  assert.ok(!R(withBreak,base.products.find(p=>/snail/i.test(p.brandName||p.genericName)),today,'pm').length,'a hydrating step does not warn');});
t('nothing scheduled during the break sets the warning off',()=>{const R=get('addStepIrritationRisks');
  bdays.forEach(d=>['am','pm'].forEach(s=>pl[d+':'+s].forEach(p=>assert.deepStrictEqual(R(withBreak,p,d,s),[],d+s+' '+p.genericName))));});
t('skinBreakOn covers the logged day and the next, not the third',()=>{const f=get('skinBreakOn');const pr=[{date:'2026-10-29',type:'irritation'}];
  assert.ok(f(pr,'2026-10-29')&&f(pr,'2026-10-30'));assert.ok(!f(pr,'2026-10-31')&&!f(pr,'2026-10-28'));assert.strictEqual(f([{date:'2026-10-29',type:'redlight'},null,{type:'irritation'}],'2026-10-29'),null);});
console.log('migrations');
const M=id=>get('MIGRATIONS').find(m=>m.id===id);
t('his library: a break starts Oct 29; idempotent; not on top of one he logged',()=>{
  assert.ok(seed.procedures.some(x=>x.type==='irritation'&&x.date==='2026-10-29'));
  const once=M('skin_break_2026_10_29_v1').apply({procedures:[]});assert.strictEqual(once.procedures.length,1);
  assert.strictEqual(M('skin_break_2026_10_29_v1').apply(once),once);
  const own={procedures:[{date:'2026-10-28',type:'irritation'}]};assert.strictEqual(M('skin_break_2026_10_29_v1').apply(own),own);
  const e={};assert.strictEqual(M('skin_break_2026_10_29_v1').apply(e).procedures.length,1);});
t('...and does nothing once the break would be over',()=>{const late=load([2026,10,2]);const m=late('MIGRATIONS').find(m=>m.id==='skin_break_2026_10_29_v1');const p={procedures:[]};assert.strictEqual(m.apply(p),p);});
t('only the Caudalie gel cleanser is marked fragranced',()=>{const marked=seed.products.filter(p=>p.fragranced).map(p=>p.genericName);assert.deepStrictEqual(marked,['Purifying Gel Cleanser']);
  const m=M('mark_fragranced_cleanser_v1');const once=m.apply({products:seed.products.map(({fragranced,...p})=>p)});assert.strictEqual(m.apply(once),once);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
