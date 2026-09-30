const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
(async()=>{const server=await serve(8141);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2});
const products=[P(1,'8 Hyaluronic Acid Moisturizing Gentle Gel Cleanser','pm','daily',{brandName:'Anua'}),
  P(2,'Niacinamide 10% + Zinc 1%','pm','daily',{brandName:'The Ordinary'}),
  P(3,'powder exfoliant','pm','daily',{brandName:'Dermalogica Daily Microfoliant'}),
  P(4,'Ginseng Essence Water','pm','daily',{brandName:'Beauty of Joseon'}),
  P(5,'water gel moisturizer','pm','daily',{brandName:'Beauty of Joseon Red Bean Water Gel'}),
  P(6,'overnight lip sleeping mask','pm','daily',{brandName:'Petitfée Oil Blossom Lip Mask'})];
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8141/');await page.waitForSelector('[data-testid=usage-toggle]');
const order=await page.evaluate(()=>[...document.querySelectorAll('[data-testid=usage-toggle]')].map(b=>b.closest('div[style*="flex-wrap"]').querySelector('span[style*="font-weight: 600"]').innerText.replace(/^\d+\.\s*/,'').split(' · ')[0].trim()));
console.log('   rendered:',order.join(' → '));
const idx=n=>order.findIndex(x=>x.startsWith(n));
ok(idx('8 Hyaluronic')===0,'cleanser first');
ok(idx('powder exfoliant')===1,'exfoliant right after cleanser');
ok(idx('Ginseng')<idx('Niacinamide'),'essence before niacinamide');
ok(idx('Niacinamide')<idx('water gel'),'niacinamide before moisturizer');
ok(idx('overnight lip')===order.length-1,'lip last');
await page.screenshot({path:'order-390.png'});
ok(errors.length===0,'no page errors');
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\norder e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
