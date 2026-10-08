const http=require('http'),fs=require('fs');
module.exports=port=>{
  const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8')
    .replace('https://unpkg.com/react@18/umd/react.production.min.js','/react.js')
    .replace('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js','/react-dom.js')
    .replace('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','/html2canvas.js');
  const files={'/':[html,'text/html'],'/react.js':[fs.readFileSync('node_modules/react/umd/react.production.min.js'),'text/javascript'],'/react-dom.js':[fs.readFileSync('node_modules/react-dom/umd/react-dom.production.min.js'),'text/javascript'],'/html2canvas.js':[fs.readFileSync('node_modules/html2canvas/dist/html2canvas.min.js'),'text/javascript'],'/manifest.json':['{}','application/json']};
  const s=http.createServer((q,r)=>{const f=files[q.url.split('?')[0]];if(!f){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':f[1]});r.end(f[0])});
  return new Promise(res=>s.listen(port,()=>res(s)));
};
