// A step that was swapped in can be swapped again, and the original stays
// out; Remove brings the original back (2026-10-29).
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Gel Cleanser','pm','daily'),P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),
  P(27,'Ginseng Essence Water','pm','daily',{brandName:'Beauty of Joseon',scheduled:false,nextDate:''}),
  P(18,'Hydrating Serum','pm','daily',{brandName:'The Ordinary Marine Hyaluronics',scheduled:false,nextDate:''}),
  P(5,'water gel moisturizer','pm','daily')];
(async()=>{const server=await serve(8157);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900}});
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8157/');await page.waitForSelector('[data-testid=usage-toggle]');
const names=async()=>page.evaluate(()=>[...document.querySelectorAll('[data-testid=usage-toggle]')].map(b=>b.closest('div[style*="flex-wrap"]').innerText.split('\n').find(l=>/^\d+\./.test(l))||''));
const row=n=>page.locator('div[style*="flex-wrap"]',{has:page.locator(`span:has-text("${n}")`)}).last();
const swapTo=async(from,to)=>{await row(from).getByRole('button',{name:/Swap/}).click();await page.waitForSelector('[data-testid=picker-row]');
  await page.locator('[data-testid=picker-row]',{hasText:to}).first().click();await page.waitForTimeout(250);};
ok((await names()).some(n=>/Snail/.test(n)),'Snail is on tonight');
await swapTo('Snail 96','Ginseng Essence');
let n=await names();ok(n.some(x=>/Ginseng/.test(x))&&!n.some(x=>/Snail/.test(x)),'swapped to Ginseng');
ok(await row('Ginseng Essence').getByRole('button',{name:/Swap/}).count()===1,'the swapped-in step has a Swap button');
ok(await row('Ginseng Essence').getByRole('button',{name:'Remove'}).count()===1,'...and still a Remove button');
await swapTo('Ginseng Essence','Hydrating Serum');
n=await names();console.log('   after 2nd swap:',n.join(' → '));
ok(n.some(x=>/Hydrating Serum/.test(x))&&!n.some(x=>/Ginseng|Snail/.test(x)),'swapped again: Marine in, Ginseng out, Snail still out');
const pins=await page.evaluate(()=>JSON.parse(localStorage.getItem('skinritual_v4')).profile.pins);
ok(pins.length===1&&pins[0].productId===18&&(pins[0].bumps||[]).includes(17),'one pin left, and it keeps Snail out');
await row('Hydrating Serum').getByRole('button',{name:'Remove'}).click();await page.waitForTimeout(250);
n=await names();ok(n.some(x=>/Snail/.test(x))&&!n.some(x=>/Hydrating Serum|Ginseng/.test(x)),'Remove brings the original Snail back');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nswap-again e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
