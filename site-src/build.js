// Build : node build.js  (depuis site-src/)
// Génère ../catalogue-cocktails/site/index.html, site/bar.html, netlify/shared/names.mjs et site/sw.js
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const OUT=path.join(__dirname,"..","catalogue-cocktails"), SITE=path.join(OUT,"site");
const h=fs.readFileSync(path.join(__dirname,"recipes-source.html"),"utf8");
const a=h.indexOf("const C = [")+10, b=h.indexOf("];",a)+1, rec=h.slice(a,b), C=eval(rec);
const m=JSON.parse(fs.readFileSync(path.join(__dirname,"imgmeta.json"),"utf8"));
const V=JSON.parse(fs.readFileSync(path.join(__dirname,"version.json"),"utf8"));
const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const vd=new Date(V.date+"T12:00:00Z"), VLABEL=`v${V.version} · ${vd.getUTCDate()} ${MOIS[vd.getUTCMonth()]}`;
// Étapes de préparation : privées par défaut. Elles ne vont JAMAIS dans site/ : seulement dans lib/steps-data.mjs (serveur).
const STEPS=Object.fromEntries(C.map(c=>[m.slugs[c.n],c.st]));
fs.writeFileSync(path.join(OUT,"lib","steps-data.mjs"),"// Généré par site-src/build.js : étapes de préparation, servies seulement par /api/etapes. Ne jamais copier dans site/.\nexport const STEPS = "+JSON.stringify(STEPS)+";\n");
const PUBLIC_C=C.map(({st,...rest})=>rest); // données publiques : tout sauf les étapes
const page=fs.readFileSync(path.join(__dirname,"template.html"),"utf8").replace("__VERSION__",()=>VLABEL).replace("__RECIPES__",()=>JSON.stringify(PUBLIC_C)).replace("__IMG__",()=>JSON.stringify(m)).replace(/__COUNT__/g,String(C.length));
fs.writeFileSync(path.join(SITE,"index.html"),page);
const items=C.map(c=>[c.n,c.b,m.slugs[c.n]]);
fs.writeFileSync(path.join(SITE,"bar.html"),fs.readFileSync(path.join(__dirname,"bar-template.html"),"utf8").replace("__ITEMS__",()=>JSON.stringify(items)));
fs.mkdirSync(path.join(OUT,"netlify","shared"),{recursive:true});
fs.writeFileSync(path.join(OUT,"netlify","shared","names.mjs"),"// Généré par site-src/build.js : noms des cocktails acceptés par le serveur.\nexport const NAMES = "+JSON.stringify(C.map(c=>c.n),null,0)+";\n");
// Service worker
const ls=d=>fs.readdirSync(path.join(SITE,d));
const core=["./","index.html","config.js","manifest.webmanifest","favicon-32.png","icon-192.png","icon-512.png","apple-touch-icon.png","images/hero-md.webp",...ls("fonts").map(f=>"fonts/"+f)];
const extra=[...ls("images").filter(f=>f.endsWith("-sm.webp")).map(f=>"images/"+f),...ls("images/ingredients").map(f=>"images/ingredients/"+f)].sort();
const ver=crypto.createHash("sha1").update(page).update(fs.readFileSync(path.join(SITE,"config.js"))).digest("hex").slice(0,10);
fs.writeFileSync(path.join(SITE,"sw.js"),`/* Le Bar de Yanniel : fonctionnement hors ligne */
const VERSION="bar-${ver}";
const CORE=${JSON.stringify(core)};
const EXTRA=${JSON.stringify(extra)};
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(async c=>{await c.addAll(CORE);await Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{})));}).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url); if(u.origin!==location.origin)return;
  if(u.pathname.startsWith("/api/")||u.pathname==="/bar"||u.pathname==="/bar.html")return; // toujours en direct
  if(r.headers.has("range")||u.pathname.endsWith(".mp4"))return; // vidéo : lecture par plages, sans cache
  if(r.mode==="navigate"){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put("index.html",cp));return res;}).catch(()=>caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})));
});
`);
fs.writeFileSync(path.join(SITE,"version.json"),JSON.stringify({version:V.version,date:V.date,label:VLABEL,sw:ver})+"\n");
console.log("version",VLABEL,"recipes",C.length,"index",page.length,"sw",ver);
