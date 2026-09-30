const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,baseProducts,P,T}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const LONG='Extremely Long Hydrating Rice Water Brightening Toner Essence Deluxe Edition';
(async()=>{
  const server=await serve(8140);
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
  const products=[...baseProducts(),
    P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),
    P(30,'Glycolic Acid 7% Toning Solution','pm','daily',{brandName:'The Ordinary'}),
    P(31,LONG,'pm','daily',{brandName:'Some Very Long Brand Name'})].filter(p=>![2,3,4].includes(p.id));
  for(const width of [320,390,430]){
    const ctx=await b.newContext({viewport:{width,height:900},deviceScaleFactor:2});
    await ctx.addInitScript(({seed})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
      class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
      if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products,migrations:MIG})});
    const page=await ctx.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text())});
    await page.goto('http://localhost:8140/');await page.waitForSelector('[data-testid=usage-toggle]');
    const m=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('[data-testid=usage-toggle]')].map(x=>x.closest('div[style*="flex-wrap"]')).filter(Boolean);
      return cards.map(c=>{
        const nameSpan=c.querySelector('span[style*="font-weight: 600"]');
        const cr=c.getBoundingClientRect();
        const act=c.querySelector('[data-testid=step-actions]').getBoundingClientRect();
        const chev=c.querySelector('[data-testid=usage-toggle]').getBoundingClientRect();
        const btns=[...c.querySelectorAll('[data-testid=step-actions] button')].map(x=>x.getBoundingClientRect().height);
        return {h:Math.round(cr.height),name:nameSpan.innerText.replace(/\s+/g,' ').trim(),
          clipped:nameSpan.scrollHeight>nameSpan.clientHeight+1||nameSpan.scrollWidth>nameSpan.clientWidth+1||getComputedStyle(nameSpan).textOverflow==='ellipsis'&&nameSpan.scrollWidth>nameSpan.clientWidth,
          inCard:nameSpan.getBoundingClientRect().bottom<=cr.bottom+1&&nameSpan.getBoundingClientRect().top>=cr.top-1,
          share:(act.width+chev.width)/cr.width,chevRight:Math.round(cr.right-chev.right),chevH:Math.round(chev.height),minBtn:Math.min(...btns)};
      });
    });
    console.log(`  ${width}px card heights: ${m.map(x=>x.h).join(', ')}`);
    const long=m.find(x=>x.name.includes('Extremely Long'));
    ok(m.every(x=>!x.clipped),`${width}px: no product name is truncated`);
    ok(long&&long.name.includes('Deluxe Edition'),`${width}px: the longest name renders in full`);
    ok(m.every(x=>x.inCard),`${width}px: every name stays inside its card`);
    ok(Math.min(...m.map(x=>x.h))>=82,`${width}px: cards are taller (shortest ${Math.min(...m.map(x=>x.h))}px, was 77)`);
    ok(m.every(x=>x.chevH>=x.h-2),`${width}px: expand strip still spans the full card height`);
    ok(m.every(x=>Math.abs(x.chevRight)<=2),`${width}px: expand strip sits on the right edge`);
    ok(m.every(x=>x.minBtn>=24),`${width}px: Swap/Skip tap targets intact`);
    ok(m.every(x=>x.share<=0.3),`${width}px: actions stay a thin strip (max ${Math.round(Math.max(...m.map(x=>x.share))*100)}%)`);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=width,`${width}px: no sideways scroll`);
    const hdr=await page.evaluate(()=>{const c=document.querySelector('[data-testid=calendar-controls]');
      const mids=[...c.children].map(k=>{const r=k.getBoundingClientRect();return (r.top+r.bottom)/2});return Math.max(...mids)-Math.min(...mids)});
    ok(hdr<=2,`${width}px: calendar controls still one row`);
    if(width===390){
      await page.screenshot({path:'card-390.png'});
      // interactions still work on the taller card
      const stored=async()=>JSON.parse(await page.evaluate(()=>localStorage.getItem('skinritual_v4'))).profile;
      const first=page.locator('[data-testid=usage-toggle]').first();
      await first.click();await page.waitForSelector('[data-testid=usage-panel]');
      ok(true,'expand opens the Last used panel');
      const panelBox=await page.locator('[data-testid=usage-panel]').first().boundingBox();
      const chevBox=await first.boundingBox();
      ok(chevBox.y+chevBox.height<=panelBox.y+1,'open expand strip does not overlap the panel');
      await page.screenshot({path:'card-390-open.png'});
      await first.click();
      await page.locator('button[title="Swap this step"]').first().click();
      await page.waitForSelector('[data-testid=picker-block], [data-testid=already-in-block]');
      ok(true,'Swap opens the picker');
      await page.keyboard.press('Escape');await page.locator('button:has-text("×")').first().click().catch(()=>{});
      const before=(await stored()).logs.length;
      await page.locator('button:has-text("Skip")').first().click();await page.waitForTimeout(150);
      ok((await stored()).logs.length===before+1,'Skip still records');
    }
    ok(errors.length===0,`${width}px: no page errors ${errors.length?JSON.stringify(errors.slice(0,2)):''}`);
    await ctx.close();
  }
  await b.close();server.close();
  console.log(fails?`\n${fails} FAILED`:'\nall layout checks passed');process.exit(fails?1:0);
})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
