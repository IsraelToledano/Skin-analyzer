// Adding a step that clashes with what ran in the last day stops with a
// warning (why + Add anyway / Don't add); an evening add that affects the
// next morning updates it at once and says so — no Sync, no reload.
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[
  P(1,'Gentle Exfoliating SA Cleanser','am','daily',{brandName:'Cetaphil'}),
  P(2,'Gentle Gel Cleanser','pm','daily',{brandName:'Anua'}),
  P(5,'Vitamin C Serum','am','daily',{brandName:"Pura d'or 20%"}),
  P(6,'water gel moisturizer','both','daily'),
  P(7,'Sunscreen Serum SPF 50','am','daily'),
  P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),
  P(6.5,'powder exfoliant','pm','weekly',{brandName:'Dermalogica Daily Microfoliant',scheduled:false,nextDate:''}),
  P(10,'hydrating cream mask','pm','weekly',{brandName:'Caudalie VinoHydra',scheduled:false,nextDate:'',rotationRole:'none'})];
(async()=>{const server=await serve(8153);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:2});
await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
  class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
  if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8153/');await page.waitForSelector('[data-testid=usage-toggle]');
// the morning block of the shown day, opened if collapsed (SPF is always in it)
const morningText=async()=>{if(!(await page.getByText('Sunscreen Serum SPF 50').count())){await page.locator('span',{hasText:'Morning Routine'}).first().click();await page.waitForTimeout(200);}
  return page.evaluate(()=>{const rows=[...document.querySelectorAll('[data-testid=usage-toggle]')].map(b=>b.closest('div[style*="flex-wrap"]').innerText);const i=rows.findIndex(t=>/Sunscreen/.test(t));return rows.slice(0,i+1).join(' | ');});};
const go=async dir=>{await page.getByRole('button',{name:dir>0?'Next day':'Previous day'}).click();await page.waitForTimeout(200);};
const pmNames=async()=>page.evaluate(()=>[...document.querySelectorAll('[data-testid=usage-toggle]')].map(b=>b.closest('div[style*="flex-wrap"]').innerText));
await go(1);const tomorrowBefore=await morningText();console.log('   tomorrow AM before:',tomorrowBefore.replace(/\s+/g,' ').slice(0,200));await go(-1);
ok(/Vitamin C Serum/.test(tomorrowBefore)&&/Gentle Exfoliating SA/.test(tomorrowBefore),'before: tomorrow morning has vitamin C and the acid wash');
// 1. a clashing add: this morning had 20% vitamin C
await page.getByText('+ Add step').last().click();await page.waitForSelector('[data-testid=picker-row]');
await page.locator('[data-testid=picker-row]',{hasText:'Microfoliant'}).click();
await page.waitForSelector('[data-testid=risk-prompt]',{timeout:5000}).catch(()=>{});
ok(await page.locator('[data-testid=risk-prompt]').count()===1,'adding an exfoliant after a vitamin C morning shows the warning');
const reasons=(await page.locator('[data-testid=risk-reason]').allInnerTexts()).join(' | ');console.log('   reason:',reasons);
ok(/This morning/.test(reasons)&&/Vitamin C Serum/.test(reasons)&&/acidic/.test(reasons),'the warning says what ran this morning and why it matters');
await page.screenshot({path:'risk.png'});
await page.locator('[data-testid=risk-cancel]').click();await page.waitForTimeout(200);
ok(await page.locator('[data-testid=risk-prompt]').count()===0&&await page.locator('[data-testid=picker-row]').count()===0,"\"Don't add\" closes the warning and the picker");
ok(!(await pmNames()).some(t=>/Microfoliant/.test(t)),"\"Don't add\" leaves tonight unchanged");
// 2. add anyway
await page.getByText('+ Add step').last().click();await page.waitForSelector('[data-testid=picker-row]');
await page.locator('[data-testid=picker-row]',{hasText:'Microfoliant'}).click();await page.waitForSelector('[data-testid=risk-prompt]');
await page.locator('[data-testid=risk-add-anyway]').click();await page.waitForSelector('[data-testid=add-notice]');
ok((await pmNames()).some(t=>/Microfoliant/.test(t)),'"Add anyway" adds it to tonight');
const notice=(await page.locator('[data-testid=add-notice]').innerText()).replace(/\s+/g,' ');console.log('   notice:',notice);
ok(/Tomorrow morning: − Vitamin C Serum/.test(notice),'the notice says tomorrow morning loses the vitamin C');
// 3. the next morning updated right away — no Sync, no reload
await go(1);const tomorrowAfter=await morningText();console.log('   tomorrow AM after:',tomorrowAfter.replace(/\s+/g,' ').slice(0,200));
ok(!/Vitamin C Serum/.test(tomorrowAfter),'tomorrow morning no longer has vitamin C');
ok(!/Gentle Exfoliating SA/.test(tomorrowAfter)&&/Gentle Gel Cleanser/.test(tomorrowAfter),'tomorrow morning washes with the gentle cleanser instead of the acid one');
await go(-1);
// 4. a harmless add goes straight in
await page.getByText('+ Add step').last().click();await page.waitForSelector('[data-testid=picker-row]');
await page.locator('[data-testid=picker-row]',{hasText:'hydrating cream mask'}).click();await page.waitForTimeout(300);
ok(await page.locator('[data-testid=risk-prompt]').count()===0,'a hydrating mask adds with no warning');
// 5. survives reload
await page.reload();await page.waitForSelector('text=Evening Routine');await go(1);
ok(!/Vitamin C Serum/.test(await morningText()),'still updated after a reload');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nrisk e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
