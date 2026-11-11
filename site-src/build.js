// Build : node build.js  (depuis site-src/)
// Génère ../catalogue-cocktails/site/index.html, site/bar.html, netlify/shared/names.mjs et site/sw.js
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const OUT=path.join(__dirname,"..","catalogue-cocktails"), SITE=path.join(OUT,"site");
const h=fs.readFileSync(path.join(__dirname,"recipes-source.html"),"utf8");
const a=h.indexOf("const C = [")+10, b=h.indexOf("];",a)+1, rec=h.slice(a,b), C=eval(rec);
const m=JSON.parse(fs.readFileSync(path.join(__dirname,"imgmeta.json"),"utf8"));
const page=fs.readFileSync(path.join(__dirname,"template.html"),"utf8").replace("__RECIPES__",()=>rec).replace("__IMG__",()=>JSON.stringify(m)).replace(/__COUNT__/g,String(C.length));
fs.writeFileSync(path.join(SITE,"index.html"),page);
const items=C.map(c=>[c.n,c.b,m.slugs[c.n]]);
fs.writeFileSync(path.join(SITE,"bar.html"),fs.readFileSync(path.join(__dirname,"bar-template.html"),"utf8").replace("__ITEMS__",()=>JSON.stringify(items)));
fs.mkdirSync(path.join(OUT,"netlify","shared"),{recursive:true});
fs.writeFileSync(path.join(OUT,"netlify","shared","names.mjs"),"// Généré par site-src/build.js : noms des cocktails acceptés par le serveur.\nexport const NAMES = "+JSON.stringify(C.map(c=>c.n),null,0)+";\n");
// Service worker
const ls=d=>fs.readdirSync(path.join(SITE,d));
const core=["./","index.html","manifest.webmanifest","favicon-32.png","icon-192.png","icon-512.png","apple-touch-icon.png","images/hero-md.webp",...ls("fonts").map(f=>"fonts/"+f)];
const extra=[...ls("images").filter(f=>f.endsWith("-sm.webp")).map(f=>"images/"+f),...ls("images/ingredients").map(f=>"images/ingredients/"+f)].sort();
const ver=crypto.createHash("sha1").update(page).digest("hex").slice(0,10);
fs.writeFileSync(path.join(SITE,"sw.js"),`/* Le Bar de Yann : fonctionnement hors ligne */
const VERSION="bar-${ver}";
const CORE=${JSON.stringify(core)};
const EXTRA=${JSON.stringify(extra)};
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(async c=>{await c.addAll(CORE);await Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{})));}).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url); if(u.origin!==location.origin)return;
  if(u.pathname.startsWith("/api/")||u.pathname==="/bar"||u.pathname==="/bar.html")return; // toujours en direct
  if(r.mode==="navigate"){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put("index.html",cp));return res;}).catch(()=>caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})));
});
`);
console.log("recipes",C.length,"index",page.length,"sw",ver);
