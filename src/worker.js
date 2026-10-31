// ÉcolePlus — API Cloudflare Worker + D1. Les fichiers statiques sont servis depuis /public.
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const enc=new TextEncoder(),b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hash(p,salt){const k=await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']);return b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:ub(salt),iterations:100000},k,256))}
const hk=s=>crypto.subtle.importKey('raw',enc.encode(s),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function sign(env,o){const p=btoa(JSON.stringify(o));return p+'.'+b64(await crypto.subtle.sign('HMAC',await hk(env.SECRET),enc.encode(p)))}
async function check(env,req){try{const[p,s]=(req.headers.get('authorization')||'').slice(7).split('.');if(!await crypto.subtle.verify('HMAC',await hk(env.SECRET),ub(s),enc.encode(p)))return;const o=JSON.parse(atob(p));if(o.exp>Date.now())return o}catch{}}
const salt=()=>b64(crypto.getRandomValues(new Uint8Array(16)));
const pub=u=>({id:u.id,n:u.nom,e:u.email,r:u.role,s:u.school});
async function session(env,u){return{token:await sign(env,{u:u.id,s:u.school,r:u.role,exp:Date.now()+30*864e5}),user:pub(u)}}
const ROLES=['director','secretariat','teacher','cashier','librarian'];
// Types d'enregistrements que chaque rôle peut ÉCRIRE (le directeur peut tout écrire)
const WR={secretariat:'student class att exam msg fee echeance mat cand disc texte conseil livre emp menu cant ligne trs',teacher:'att exam msg texte conseil disc',cashier:'fee echeance dep',librarian:'livre emp menu cant ligne trs'};
// Types qu'un rôle NE PEUT PAS lire
const DENY={teacher:['fee','echeance','staff','heure','avance','dep'],secretariat:['staff','heure','avance','dep'],cashier:['staff','heure','avance'],librarian:['fee','echeance','staff','heure','avance','dep','disc']};
// Types dont chaque modification est enregistrée dans le journal
const AUD=['fee','student','staff','heure','avance','dep','cfg','disc'];

export default{async fetch(req,env){
const url=new URL(req.url),p=url.pathname;
if(!p.startsWith('/api/'))return env.ASSETS.fetch(req);
if(!env.SECRET)return J({error:'Variable secrète SECRET non configurée'},500);
try{
const body=req.method=='POST'?await req.json().catch(()=>({})):{};
if(p=='/api/setup'&&req.method=='POST'){
 const n=await env.DB.prepare('SELECT COUNT(*) c FROM users').first();if(n.c>0)return J({error:'Établissement déjà créé. Connectez-vous.'},403);
 if(!body.email||!body.password||body.password.length<8)return J({error:'E-mail et mot de passe (8 caractères min.) requis'},400);
 const sid=crypto.randomUUID(),uid=crypto.randomUUID(),s=salt();
 await env.DB.batch([env.DB.prepare('INSERT INTO schools(id,nom) VALUES(?,?)').bind(sid,body.ecole||'Mon établissement'),
  env.DB.prepare('INSERT INTO users(id,school,nom,email,role,hash,salt) VALUES(?,?,?,?,?,?,?)').bind(uid,sid,body.nom||'Directeur',body.email.toLowerCase(),'director',await hash(body.password,s),s)]);
 return J(await session(env,{id:uid,school:sid,nom:body.nom,email:body.email,role:'director'}))}
if(p=='/api/login'&&req.method=='POST'){
 const u=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind((body.email||'').toLowerCase()).first();
 if(!u||u.hash!=await hash(body.password||'',u.salt))return J({error:'Identifiant ou mot de passe incorrect'},401);
 if(!u.actif)return J({error:'Compte suspendu'},403);
 await env.DB.prepare('UPDATE users SET last=? WHERE id=?').bind(Date.now(),u.id).run();return J(await session(env,u))}
const a=await check(env,req);if(!a)return J({error:'Session expirée'},401);
if(p=='/api/sync'&&req.method=='POST'){
 const now=Date.now(),ok=a.r=='director'?null:(WR[a.r]||'').split(' ');
 const ch=(Array.isArray(body.changes)?body.changes:[]).filter(c=>c&&c.id&&c.type&&(!ok||ok.includes(c.type)));
 const q=ch.map(c=>env.DB.prepare('INSERT INTO records(id,school,type,data,t,x,st) VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET data=?4,t=?5,x=?6,st=?7 WHERE records.school=?2 AND records.t<=?5').bind(String(c.id),a.s,String(c.type),JSON.stringify(c.d||{}),+c.t||now,c.x?1:0,now));
 const au=ch.filter(c=>AUD.includes(c.type)).map(c=>env.DB.prepare('INSERT INTO audit(school,uid,type,rid,x,t) VALUES(?,?,?,?,?,?)').bind(a.s,a.u,String(c.type),String(c.id),c.x?1:0,now));
 for(let i=0;i<q.length;i+=50)await env.DB.batch(q.slice(i,i+50));
 for(let i=0;i<au.length;i+=50)await env.DB.batch(au.slice(i,i+50));
 const dn=DENY[a.r]||[];
 const{results}=await env.DB.prepare('SELECT id,type,data,t,x FROM records WHERE school=?1 AND st>?2').bind(a.s,+body.since||0).all();
 return J({now:now-2000,recs:results.filter(r=>!dn.includes(r.type)).map(r=>({id:r.id,type:r.type,d:JSON.parse(r.data),t:r.t,x:r.x}))})}
if(p=='/api/audit'&&req.method=='GET'){
 if(a.r!='director')return J({error:'Réservé au directeur'},403);
 const{results}=await env.DB.prepare('SELECT a.t,a.type,a.rid,a.x,u.nom FROM audit a LEFT JOIN users u ON u.id=a.uid WHERE a.school=? ORDER BY a.t DESC LIMIT 200').bind(a.s).all();return J(results)}
if(p=='/api/users'){
 if(a.r!='director')return J({error:'Réservé au directeur'},403);
 if(req.method=='GET'){const{results}=await env.DB.prepare('SELECT id,nom,email,role,actif,last FROM users WHERE school=?').bind(a.s).all();return J(results)}
 if(!ROLES.includes(body.role)||!body.email||(body.password||'').length<8)return J({error:'Champs invalides (mot de passe 8+)'},400);
 const s=salt();try{await env.DB.prepare('INSERT INTO users(id,school,nom,email,role,hash,salt) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),a.s,body.nom,body.email.toLowerCase(),body.role,await hash(body.password,s),s).run()}catch{return J({error:'E-mail déjà utilisé'},409)}
 return J({ok:1})}
const m=p.match(/^\/api\/users\/([\w-]+)\/toggle$/);
if(m&&a.r=='director'&&m[1]!=a.u){await env.DB.prepare('UPDATE users SET actif=1-actif WHERE id=? AND school=?').bind(m[1],a.s).run();return J({ok:1})}
return J({error:'Introuvable'},404)}catch(e){return J({error:'Erreur serveur'},500)}}}
