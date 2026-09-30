const assert=require('assert');const A=require('./harness').loadApp();const {P,profile,T}=require('./fixture');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
// Israel's evening from the screenshot, in the (wrong) order it rendered
const evening=()=>[
  P(1,'8 Hyaluronic Acid Moisturizing Gentle Gel Cleanser','pm','daily',{brandName:'Anua'}),
  P(2,'Niacinamide 10% + Zinc 1%','both','daily',{brandName:'The Ordinary'}),
  P(3,'powder exfoliant','pm','weekly',{brandName:'Dermalogica Daily Microfoliant'}),
  P(4,'Ginseng Essence Water','pm','daily',{brandName:'Beauty of Joseon'}),
  P(5,'water gel moisturizer','both','daily',{brandName:'Beauty of Joseon Red Bean Water Gel'}),
  P(6,'overnight lip sleeping mask','pm','daily',{brandName:'Petitfée Oil Blossom Lip Mask'})];
const names=l=>l.map(p=>p.genericName);
console.log('his evening');
t('classified as expected',()=>{
  assert.deepStrictEqual(evening().map(A.detectType),['cleanser','niacinamide','exfoliant','essence','moisturizer','lip']);
});
t('renders cleanser → exfoliant → essence → niacinamide → moisturizer → lip',()=>{
  const shuffled=[...evening()].reverse();
  assert.deepStrictEqual(names(A.sortForDay(shuffled,profile(),T,'pm')),
    ['8 Hyaluronic Acid Moisturizing Gentle Gel Cleanser','powder exfoliant','Ginseng Essence Water','Niacinamide 10% + Zinc 1%','water gel moisturizer','overnight lip sleeping mask']);
});
t('niacinamide is never before the exfoliant or the essence',()=>{
  const o=names(A.sortForDay(evening(),profile(),T,'pm'));
  assert.ok(o.indexOf('Niacinamide 10% + Zinc 1%')>o.indexOf('powder exfoliant'));
  assert.ok(o.indexOf('Niacinamide 10% + Zinc 1%')>o.indexOf('Ginseng Essence Water'));
});
t('"why this step" explains the new positions',()=>{
  const e=evening();
  assert.strictEqual(A.stepInfoFor(e[2]).name,'Exfoliant');
  assert.strictEqual(A.stepInfoFor(e[3]).name,'Essence');
  assert.ok(/AM active|niacinamide/i.test(A.stepInfoFor(e[1]).name));
});
t('"why this step" ignores a stale stored stepOrder',()=>{
  const stale={...evening()[3],stepOrder:50};
  assert.strictEqual(A.stepInfoFor(stale).name,'Essence');
});
console.log('full canonical order');
const all=[['cleanser_oil','Cleansing Oil'],['cleanser','Gel Cleanser'],['exfoliant','Glycolic Acid 7% Toning Solution'],['toner','Hydrating Toner'],['essence','Snail 96 Mucin Power Essence'],['vitc','Vitamin C Serum'],['retinoid','Retinol Serum'],['serum','Peptide Serum'],['eye','Eye Cream'],['mask','Sheet Mask'],['faceoil','Squalane Face Oil'],['moisturizer','Barrier Cream Moisturizer'],['lip','Lip Balm'],['spf','SPF 50 Sunscreen']];
t('each test product classifies into its intended category',()=>{all.forEach(([type,n],i)=>assert.strictEqual(A.detectType(P(i,n,'pm','daily')),type,n))});
t('strict layering order holds across every category',()=>{
  const ps=all.map(([,n],i)=>P(100+i,n,'pm','daily'));
  const o=A.sortForDay([...ps].reverse(),profile(),T,'pm').map(p=>A.detectType(p));
  assert.deepStrictEqual(o,all.map(([type])=>type));
});
t('oil cleanse still precedes the water cleanse, and every cleanser precedes the exfoliant',()=>{
  const o=all.map(([t])=>t);assert.ok(o.indexOf('cleanser_oil')<o.indexOf('cleanser')&&o.indexOf('cleanser')<o.indexOf('exfoliant'));
});
t('rinse-off exfoliant lands before any leave-on step',()=>{
  const micro=P(3,'powder exfoliant','pm','weekly',{brandName:'Dermalogica Daily Microfoliant'});
  const leaveOn=all.slice(3).map(([,n],i)=>P(200+i,n,'pm','daily'));
  const o=A.sortForDay([...leaveOn,micro],profile(),T,'pm');
  assert.strictEqual(o[0].id,3);
});
console.log('drag override still respected');
t('a same-day drag keeps its order; only unnamed steps slot in by category',()=>{
  const e=evening();
  const prof=profile({dayOrder:{[`${T}:pm`]:[1,2,3]}});
  const ids=A.sortForDay(e,prof,T,'pm').map(p=>p.id);
  const named=ids.filter(i=>[1,2,3].includes(i));
  assert.deepStrictEqual(named,[1,2,3],'dragged order not kept');
  assert.strictEqual(ids.length,6);
});
t('a drag on another day does not affect today',()=>{
  const prof=profile({dayOrder:{['2026-09-19:pm']:[2,1]}});
  assert.strictEqual(A.sortForDay(evening(),prof,T,'pm')[1].id,3);
});
console.log('failure cases');
t('unknown/blank product does not throw and sorts mid-routine',()=>{
  const o=A.sortForDay([...evening(),{id:99,genericName:'',brandName:''}],profile(),T,'pm');
  assert.strictEqual(o.length,7);
  assert.strictEqual(A.canonicalStepOrder({id:99,genericName:''}),50);
});
t('malformed dayOrder is ignored',()=>{[null,'x',5,{}].forEach(d=>assert.strictEqual(A.sortForDay(evening(),profile({dayOrder:{[`${T}:pm`]:d}}),T,'pm').length,6))});
t('notes text cannot reclassify a product',()=>{
  const p=P(7,'water gel moisturizer','pm','daily',{notes:'use after exfoliant and essence'});
  assert.strictEqual(A.detectType(p),'moisturizer');
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
