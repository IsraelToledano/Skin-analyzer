const fs=require('fs');const Babel=require('@babel/standalone');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
try{Babel.transform(scripts[scripts.length-1],{presets:['react']});console.log('BABEL OK');}catch(e){console.log('BABEL FAIL',e.message);process.exit(1);}
