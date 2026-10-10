// Guards the product reviews (RANK_DATA) against reasoning that says
// nothing about the products themselves. Born from a "better option" whose
// only argument was that the alternative was "already scheduled".
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load();const R=get('RANK_DATA');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n').slice(0,6).join('\n        '))}};
const texts=r=>[...(r.pros||[]).map(x=>['pro',x]),...(r.cons||[]).map(x=>['con',x]),['general',r.general||''],
  ...(r.alternatives||[]).flatMap(a=>[['alt name',a.name],['alt note',a.note||''],...((a.compare||{}).this||[]).map(x=>['this',x]),...((a.compare||{}).other||[]).map(x=>['other',x])])];
const CIRCULAR=/already (in your|scheduled|active|in (the|your) rotation|covers)|in your (weekly )?rotation\b|if (ever )?reactivated|unscheduled list|keeps the morning|which is why it keeps/i;
const APP_TALK=/\bslot\b|\bthe app\b|schedul|\balternat(es|ing)\b/i;
t('no review argues from what is or isn\'t already in the routine',()=>{
  const hits=[];R.forEach(r=>texts(r).forEach(([k,x])=>{if(CIRCULAR.test(x))hits.push(`#${r.id} ${k}: ${x.slice(0,90)}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('pros and cons judge the formula, not the app\'s scheduling',()=>{
  const hits=[];R.forEach(r=>[...(r.pros||[]),...(r.cons||[])].forEach(x=>{if(APP_TALK.test(x))hits.push(`#${r.id}: ${x.slice(0,90)}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('every "better" alternative has a head-to-head and a reason',()=>{
  const bad=[];R.forEach(r=>(r.alternatives||[]).filter(a=>a.relation==='better').forEach(a=>{
    const c=a.compare||{};if(!(c.this&&c.this.length)||!(c.other&&c.other.length)||!(a.note&&a.note.length>40))bad.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(bad,[]);
});
t('comparison lines are short enough to read on a phone',()=>{
  const long=[];R.forEach(r=>(r.alternatives||[]).forEach(a=>[...((a.compare||{}).this||[]),...((a.compare||{}).other||[])].forEach(x=>{if(x.length>140)long.push(`#${r.id}: ${x.slice(0,60)}…`)})));
  assert.deepStrictEqual(long,[]);
});
t('no alternative points to a product that was deleted or finished',()=>{
  const gone=/bio-?oil|yeouth niacinamide|mars safranal|effaclar mat/i;const hits=[];
  R.forEach(r=>(r.alternatives||[]).forEach(a=>{if(gone.test(a.name)||gone.test(a.note||''))hits.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('an alternative is never the product itself',()=>{
  const hits=[];R.filter(r=>r.id!==28/* Avène vs La Roche-Posay thermal water: same generic match words, different brands */).forEach(r=>(r.alternatives||[]).forEach(a=>{const hay=a.name.toLowerCase();if(r.match.every(k=>hay.includes(k)))hits.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('each of his scheduled products resolves to a review that has content',()=>{
  const prof=seedProfile(get);const missing=[];
  prof.products.filter(p=>p.scheduled).forEach(p=>{const r=get('getProductRank')(p);if(!r||!r.id||!(r.general||'').length)missing.push(p.genericName)});
  assert.deepStrictEqual(missing,[]);
});
console.log('market-relative ranks (2026-10-10)');
const inLibrary=()=>{const prof=seedProfile(get);return prof.products.map(p=>get('getProductRank')(p)).filter(r=>r&&r.id);};
const nums=x=>(String(x).match(/\$(\d+(?:\.\d+)?)/g)||[]).map(v=>+v.slice(1));
t('every "better" pick for a product in his library says what it costs and where to buy it',()=>{
  const bad=[];inLibrary().forEach(r=>(r.alternatives||[]).filter(a=>a.relation==='better').forEach(a=>{if(!a.price||!a.where)bad.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(bad,[]);
});
t('no "better" pick costs more than 2x the product it replaces',()=>{
  const bad=[];R.forEach(r=>(r.alternatives||[]).filter(a=>a.relation==='better'&&a.price&&!/own it/i.test(a.price)).forEach(a=>{
    const [alt]=nums(a.price.split('(')[0]);const yours=nums((a.price.split('(')[1]||''));
    if(!alt||!yours.length)bad.push(`#${r.id} → ${a.name}: unreadable price "${a.price}"`);
    else if(alt>2*Math.max(...yours))bad.push(`#${r.id} → ${a.name}: $${alt} vs yours $${Math.max(...yours)}`)}));
  assert.deepStrictEqual(bad,[]);
});
t('a "best" product never has a "better" alternative (best means best on the market)',()=>{
  const bad=R.filter(r=>r.tag==='best'&&(r.alternatives||[]).some(a=>a.relation==='better')).map(r=>`#${r.id}`);
  assert.deepStrictEqual(bad,[]);
});
t('the clinic-price vitamin C pick is gone; the replacement keeps L-ascorbic acid + ferulic',()=>{
  const r=R.find(x=>x.id===5);assert.ok(!/silymarin/i.test(JSON.stringify(r)));
  const a=r.alternatives.find(x=>x.relation==='better');assert.ok(/ferulic/i.test(JSON.stringify(a))&&/L-ascorbic/.test(JSON.stringify(a)));
});
t('re-ranked products: retinol, purifying toner and sun serum have a market upgrade; the 2% BHA is best',()=>{
  [2,7,21].forEach(id=>{const r=R.find(x=>x.id===id);assert.strictEqual(r.tag,'good',`#${id}`);assert.ok(r.alternatives.some(a=>a.relation==='better'),`#${id}`)});
  assert.strictEqual(R.find(x=>x.id===34).tag,'best');
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
