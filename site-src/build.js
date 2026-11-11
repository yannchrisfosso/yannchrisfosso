const fs=require("fs");const [,,tpl,orig,meta,out]=process.argv;
const h=fs.readFileSync(orig,"utf8");const a=h.indexOf("const C = [")+10;const b=h.indexOf("];",a)+1;
const rec=h.slice(a,b); const C=eval(rec);
const m=JSON.parse(fs.readFileSync(meta,"utf8"));
let t=fs.readFileSync(tpl,"utf8").replace("__RECIPES__",()=>rec).replace("__IMG__",()=>JSON.stringify(m)).replace(/__COUNT__/g,String(C.length));
fs.writeFileSync(out,t);console.log("recipes",C.length,"bytes",t.length);
