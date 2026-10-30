/* ÉcolePlus — SPA hors ligne. Données : IndexedDB (local) + synchronisation D1 via /api/sync */
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const F=n=>Number(n||0).toLocaleString('fr-FR'),T=()=>new Date().toISOString().slice(0,10),U=()=>crypto.randomUUID(),hm=t=>new Date(t).toTimeString().slice(0,5),J=a=>a.join('');
const f1=n=>n==null?'—':n.toFixed(1).replace('.',','),toast=m=>{const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.append(d);setTimeout(()=>d.remove(),2200)};
let S={},idb,tok=localStorage.tok,me=JSON.parse(localStorage.me||'null'),Q='',CF='',W=JSON.parse(localStorage.W||'{}'),step=1,LR=null,AC='',AD=T(),TR='T1',EX='',SU=0,busy=0;
const os=(n,m='readonly')=>idb.transaction(n,m).objectStore(n),rq=q=>new Promise(r=>q.onsuccess=()=>r(q.result));
const getAll=n=>rq(os(n).getAll()),put=(n,v)=>rq(os(n,'readwrite').put(v)),del=(n,k)=>rq(os(n,'readwrite').delete(k)),clr=n=>rq(os(n,'readwrite').clear());

/* ---------- données locales ---------- */
const all=t=>Object.values(S).filter(r=>r.type==t&&!r.x).map(r=>({id:r.id,...r.d}));
const get=id=>S[id]&&!S[id].x?{id,...S[id].d}:null;
async function save(type,d,id=d.id||U()){const{id:_,...x}=d,r={id,type,d:x,t:Date.now(),x:0};S[id]=r;await put('r',r);await put('o',r);sync();return id}
async function rm(id){const r=S[id];r.x=1;r.t=Date.now();await put('r',r);await put('o',r);sync()}
const cfg=()=>get('cfg')||{nom:'Mon établissement',frais:150000,annee:'2025–2026'};
const studs=()=>all('student').sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')),cls=id=>get(id)?.nom||'—';
const pays=sid=>all('fee').filter(f=>f.sid==sid),paid=sid=>pays(sid).reduce((a,f)=>a+ +f.montant,0),due=s=>+s.frais||+cfg().frais,bal=s=>due(s)-paid(s.id);
const pres=sid=>{let t=0,p=0;all('att').forEach(a=>{const r=a.rows?.[sid];if(r){t++;if(r.s!='A')p++}});return t?Math.round(100*p/t):null};
function grades(sid,tr){const m={};all('exam').forEach(e=>{const n=e.notes?.[sid];if(n&&n.n!==''&&(!tr||e.tr==tr))(m[e.matiere]??=[]).push({n:+n.n,c:+e.coef||1})});return m}
const avg=a=>{const c=a.reduce((x,y)=>x+y.c,0);return c?a.reduce((x,y)=>x+y.n*y.c,0)/c:null};
const moy=(sid,tr)=>{let s=0,c=0;for(const a of Object.values(grades(sid,tr))){s+=avg(a)*a[0].c;c+=a[0].c}return c?s/c:null};
const cm=(k,m,tr)=>{const v=studs().filter(s=>s.classe==k).map(s=>grades(s.id,tr)[m]).filter(Boolean).map(avg);return v.length?v.reduce((a,b)=>a+b)/v.length:null};
const apr=n=>n>=16?'Excellent':n>=14?'Très bon travail':n>=12?'Assez bien':n>=10?'Ensemble satisfaisant':'Notions à reprendre';
const rec=()=>`REC-${new Date().getFullYear()}-${String(all('fee').length+1).padStart(5,'0')}`;
function pay(sid,m,mode,objet){return save('fee',{sid,montant:+m,mode,objet,date:T(),rec:rec()},U())}
const dl=(n,t,mime='text/csv')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+t],{type:mime}));a.download=n;a.click()};
const csv=r=>r.map(x=>x.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');

/* ---------- synchronisation ---------- */
async function badge(){const el=$('#sb');if(!el)return;const n=(await getAll('o')).length;el.textContent=!navigator.onLine?`Hors ligne · ${n} modification(s) en attente`:n?`${n} en attente de synchro`:localStorage.sy?`✓ Données à jour · synchro ${hm(+localStorage.sy)}`:'En ligne'}
async function sync(){if(busy||!tok||!navigator.onLine)return badge();busy=1;
try{const o=await getAll('o'),r=await fetch('/api/sync',{method:'POST',headers:{authorization:'Bearer '+tok,'content-type':'application/json'},body:JSON.stringify({since:+localStorage.since||0,changes:o})});
if(r.status==401){busy=0;return H2.out()}const j=await r.json();
for(const x of j.recs){const l=S[x.id];if(l&&l.t>x.t&&o.some(q=>q.id==x.id))continue;S[x.id]=x;await put('r',x)}
for(const x of o)if(S[x.id].t==x.t)await del('o',x.id);
localStorage.since=j.now;localStorage.sy=Date.now();if(!document.activeElement?.matches('input,select,textarea'))render()}catch(e){}busy=0;badge()}
async function auth(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),j=await r.json();if(!r.ok)throw j.error;
if(localStorage.sch&&localStorage.sch!=j.user.s){await clr('r');await clr('o');S={}}
tok=localStorage.tok=j.token;me=j.user;localStorage.me=JSON.stringify(me);localStorage.sch=me.s;localStorage.since=0}

/* ---------- composants ---------- */
const fld=([k,l,t='text',o],v={})=>`<label>${l}</label>`+(t=='select'?`<select name=${k}>${J(o.map(x=>`<option ${v[k]==x?'selected':''}>${x}</option>`))}</select>`:t=='classe'?`<select name=${k}>${J(all('class').map(c=>`<option value="${c.id}" ${v[k]==c.id?'selected':''}>${E(c.nom)}</option>`))}</select>`:`<input name=${k} type=${t} value="${E(v[k])}">`);
const clsSel=(v,a)=>`<select data-c=${a}>${J(all('class').map(c=>`<option value="${c.id}" ${v==c.id?'selected':''}>${E(c.nom)}</option>`))}</select>`;
const NAV=[['dash','Tableau de bord'],['eleves','Élèves'],['presences','Présences'],['classes','Classes'],['notes','Notes'],['finances','Finances'],['comm','Communication'],['rapports','Rapports'],['params','Paramètres']];
const ACC={teacher:'dash presences classes notes comm',cashier:'dash eleves finances',secretariat:'dash eleves presences classes notes finances comm rapports',librarian:'dash'};
const can=p=>me.r=='director'||(ACC[me.r]||'').split(' ').includes(p);
const WF=[[['nom','Nom'],['prenoms','Prénom(s)'],['naissance','Date de naissance','date'],['sexe','Sexe','select',['Féminin','Masculin']],['lieu','Lieu de naissance']],
[['classe','Classe','classe'],['statut','Situation','select',['Nouvelle inscription','Réinscription']]],
[['pnom','Nom du parent / tuteur'],['plien','Lien','select',['Mère','Père','Tuteur']],['ptel','Téléphone','tel'],['padr','Adresse']],[],
[['montant','Montant reçu (FCFA, optionnel)','number'],['mode','Mode de paiement','select',['Espèces','Mobile money','Virement']]]];
const PIECES=['Acte de naissance','Certificat de scolarité','Photo d’identité','Bulletin précédent'],DAYS=['lundi','mardi','mercredi','jeudi','vendredi'],TRS=['T1','T2','T3'];
/* ---------- pages ---------- */
const P={},AFTER={};
P.dash=()=>{const s=studs(),enc=all('fee').reduce((a,f)=>a+ +f.montant,0);let t=0,p=0;all('att').filter(a=>a.date==T()).forEach(a=>Object.values(a.rows).forEach(r=>{t++;if(r.s!='A')p++}));
const dues=s.filter(x=>bal(x)>0),imp=dues.reduce((a,x)=>a+bal(x),0),rc=Object.values(S).filter(r=>['fee','student','att','exam'].includes(r.type)&&!r.x).sort((a,b)=>b.t-a.t).slice(0,6);
const lab=r=>r.type=='fee'?`Paiement de ${F(r.d.montant)} FCFA`:r.type=='student'?`Inscription de ${E(r.d.prenoms)}`:r.type=='att'?`Appel validé — ${E(cls(r.d.classe))}`:`Notes — ${E(r.d.titre)}`;
return['Tableau de bord',`<div class=grid><div class="card kpi"><b>${F(s.length)}</b>Élèves inscrits</div><div class="card kpi mint"><b>${t?(100*p/t).toFixed(1).replace('.',','):'—'} %</b>Présence aujourd’hui<br><small>${p} présents</small></div>
<div class="card kpi"><b>${F(enc)}</b>FCFA encaissés<br><small>sur ${F(s.reduce((a,x)=>a+due(x),0))} attendus</small></div><div class="card kpi"><b class=red>${F(imp)}</b>Impayés<br><small>${dues.length} familles</small></div></div>
<div class=row style="align-items:flex-start"><div class=card style="flex:2"><h3>Activités récentes</h3><table><tr><th>Heure<th>Activité${J(rc.map(r=>`<tr><td>${hm(r.t)}<td>${lab(r)}`))||'<tr><td colspan=2>Aucune activité pour le moment'}</table></div>
<div class=card><h3>Raccourcis</h3><a class="btn blk" href="#/eleves/new">Nouvelle inscription</a><a class="btn l blk" href="#/presences">Faire l’appel</a><a class="btn l blk" href="#/pay">Encaisser un paiement</a><a class="btn l blk" href="#/comm">Publier une annonce</a></div></div>`]};

P.eleves=id=>{const l=studs().filter(s=>(!Q||(s.nom+' '+s.prenoms+' '+s.mat).toLowerCase().includes(Q.toLowerCase()))&&(!CF||s.classe==CF)),s=get(id)||l[0];
return['Répertoire des élèves',`<div class="card row"><span class=mut>${Q?'Recherche : '+E(Q):'Tous les élèves'}</span><select data-c=cf><option value="">Classe : toutes</option>${J(all('class').map(c=>`<option value="${c.id}" ${CF==c.id?'selected':''}>${E(c.nom)}</option>`))}</select><a class="btn" href="#/eleves/new" style="flex:none">+ Nouvelle inscription</a></div>
<div class=row style="align-items:flex-start"><div class=card><h3>${l.length} élèves</h3>${J(l.map(x=>`<div class="li ${s&&x.id==s.id?'on':''}" data-go="#/eleves/${x.id}"><b>${E(x.nom.toUpperCase())} ${E(x.prenoms)}</b><br><small>${E(cls(x.classe))} · ${x.pieces?.length>=3?'Dossier complet':'Dossier incomplet'}</small></div>`))||'<p>Aucun élève. Commencez par une inscription.</p>'}</div>
<div class=card style="flex:2">${s?`<h2>${E(s.prenoms)} ${E(s.nom)}</h2><p class=mut>${E(s.mat)} · ${E(cls(s.classe))}</p><div class=row><div><h3>Contacts</h3>${E(s.parent?.nom)} — ${E(s.parent?.lien)}<br>${E(s.parent?.tel)}<br>${E(s.parent?.adr)}</div>
<div><h3>Situation scolaire</h3>Présence : ${pres(s.id)??'—'} %<br>Moyenne : ${f1(moy(s.id))} / 20<br>Solde : ${F(bal(s))} FCFA</div></div><h3 style="margin-top:20px">Historique & documents</h3>${J(PIECES.map(p=>`${s.pieces?.includes(p)?'✓':'✗'} ${p}<br>`))}
<div class=row style="margin-top:20px"><a class=btn href="#/bulletin/${s.id}">Bulletin</a><a class="btn l" href="#/pay/${s.id}">Encaisser</a><button class="btn w" data-a=delstu data-id=${s.id}>Supprimer</button></div>`:'<p>Sélectionnez un élève.</p>'}</div></div>`]};

P['eleves/new']=()=>['Nouvelle inscription',`<div class=row>${J(['Identité','Classe','Parents','Pièces','Paiement'].map((x,i)=>`<span class="pill ${step==i+1?'on':''}">${i+1} ${x}</span>`))}</div>
<div class=row style="align-items:flex-start;margin-top:16px"><form class=card style="flex:2" data-f=enrol><h3>${['Identité de l’élève','Classe','Parents','Pièces fournies','Premier paiement'][step-1]}</h3>
${step==4?J(PIECES.map(p=>`<label><input type=checkbox name=pieces value="${p}" ${W.pieces?.includes(p)?'checked':''}> ${p}</label>`)):step==2&&!all('class').length?'<p class=red>Créez d’abord une classe (menu Classes).</p>':J(WF[step-1].map(f=>fld(f,W)))}
<div class=row style="margin-top:20px">${step>1?'<button type=button class="btn w" data-a=back>← Retour</button>':''}<button class=btn>${step==5?'Enregistrer l’inscription':'Continuer →'}</button></div></form>
<div class="card dark"><h3>Dossier en cours</h3><h2>${E(W.prenoms)} ${E(W.nom)}</h2><p>Année ${cfg().annee}<br>Matricule généré à validation</p><small>Brouillon enregistré automatiquement</small></div></div>`];

P.presences=()=>{const cl=all('class');AC=get(AC)?AC:cl[0]?.id;const a=get(`att:${AC}:${AD}`),l=studs().filter(s=>s.classe==AC),rs=Object.values(a?.rows||{}),n=k=>rs.filter(r=>r.s==k).length;
return[`Appel — ${cls(AC)}`,`<div class=row>${clsSel(AC,'ac')}<input type=date value=${AD} data-c=ad><div class="card dark" style="margin:0;flex:2">${n('P')} présents · ${n('A')} absents · ${n('R')} retards</div></div>
<form class=card data-f=att style="margin-top:16px"><div class=row><div><label>Matière</label><input name=matiere value="${E(a?.matiere)}" placeholder="Mathématiques"></div></div>
<table><tr><th>Élève<th>Statut<th>Heure<th>Motif<th>Parent notifié${J(l.map(s=>{const r=a?.rows?.[s.id]||{s:'P'};return`<tr><td>${E(s.prenoms)} ${E(s.nom)}<td><select name=s_${s.id}>${J([['P','Présent'],['R','Retard'],['A','Absent']].map(([v,t])=>`<option value=${v} ${r.s==v?'selected':''}>${t}</option>`))}</select><td><input type=time name=h_${s.id} value="${r.h||''}"><td><input name=m_${s.id} value="${E(r.m)}"><td><input type=checkbox name=p_${s.id} ${r.p?'checked':''}>`}))}</table>
${l.length?'<p><button class=btn>Valider l’appel</button></p>':'<p>Aucun élève dans cette classe.</p>'}</form>`]};

P.classes=()=>{const cl=all('class');AC=get(AC)?AC:cl[0]?.id;const c=get(AC),tt={};(c?.tt||'').split('\n').forEach(l=>{const[d,m,h]=l.split('|').map(x=>x.trim());if(d)(tt[d.toLowerCase()]??=[]).push([m,h])});
return['Classes & emploi du temps',`<div class=row>${clsSel(AC,'ac')}<form data-f=cls class=row><input name=nom placeholder="Nouvelle classe (ex. 4e B)" required><input name=prof placeholder="Prof. principal"><input name=salle placeholder="Salle"><button class="btn l">Ajouter</button></form></div>
${c?`<div class=card style="margin-top:16px"><h2 style="margin:0">${E(c.nom)}</h2><span class=mut>${studs().filter(s=>s.classe==c.id).length} élèves · Prof. principal : ${E(c.prof)} · Salle ${E(c.salle)}</span></div>
<div class=grid style="grid-template-columns:repeat(5,minmax(0,1fr))">${J(DAYS.map(d=>`<div class=card><b style="color:var(--g)">${d.toUpperCase()}</b>${J((tt[d]||[]).map(x=>`<div class=slot><b>${E(x[0])}</b><br><small>${E(x[1])}</small></div>`))}</div>`))}</div>
<form class=card data-f=tt><h3>Modifier l’emploi du temps</h3><small>Une ligne par cours : jour|matière|horaire</small><textarea name=tt rows=7 placeholder="lundi|Mathématiques|08:00-09:30">${E(c.tt)}</textarea><p><button class=btn>Enregistrer</button> <button type=button class="btn w" data-a=delcls>Supprimer la classe</button></p></form>`:'<p>Créez votre première classe.</p>'}`]};

P.notes=id=>{const e=get(id);if(e){EX=id;const l=studs().filter(s=>s.classe==e.classe),v=l.map(s=>+e.notes?.[s.id]?.n).filter(x=>!isNaN(x)),m=v.length?v.reduce((a,b)=>a+b)/v.length:null;
return['Notes & évaluations',`<div class="card row"><div><h3 style="margin:0">${E(e.matiere)} · ${E(e.titre)}</h3><small>${E(cls(e.classe))} · ${e.tr} · Coefficient ${e.coef} · /20</small></div><b style="flex:none">Moyenne de classe ${f1(m)} / 20</b></div>
<form class=card data-f=grades><table><tr><th>Élève<th>Note /20<th>Statut<th>Appréciation${J(l.map(s=>{const n=e.notes?.[s.id];return`<tr><td>${E(s.prenoms)} ${E(s.nom)}<td><input name=n_${s.id} value="${E(n?.n)}" inputmode=decimal style="width:90px"><td>${n?.s||'—'}<td>${n?apr(+n.n):''}`}))}</table>
<p><button name=act value=save class="btn w">Enregistrer</button> <button name=act value=valid class=btn>Valider les notes</button></p></form>`]}
return['Notes & évaluations',`<form class=card data-f=exam><h3>Nouvelle évaluation</h3><div class=row><div>${fld(['classe','Classe','classe'])}</div><div>${fld(['matiere','Matière'])}</div><div>${fld(['titre','Intitulé (ex. Devoir surveillé n°2)'])}</div><div>${fld(['tr','Trimestre','select',TRS])}</div><div>${fld(['coef','Coefficient','number'])}</div></div><p><button class=btn>Créer et saisir les notes</button></p></form>
<div class=card><h3>Évaluations</h3><table><tr><th>Intitulé<th>Classe<th>Matière<th>Trim.${J(all('exam').map(e=>`<tr data-go="#/notes/${e.id}"><td>${E(e.titre)}<td>${E(cls(e.classe))}<td>${E(e.matiere)}<td>${e.tr}`))||''}</table></div>`]};

P.bulletin=id=>{const s=get(id);if(!s)return['Bulletin scolaire','<p>Élève introuvable.</p>'];const g=grades(id,TR),m=moy(id,TR),l=all('att').map(a=>a.rows?.[id]).filter(Boolean),eff=studs().filter(x=>x.classe==s.classe).length;
return['Bulletin scolaire',`<div class="row noprint" style="margin-bottom:12px">${J(TRS.map(t=>`<button class="pill ${t==TR?'on':''}" data-a=tr data-id=${t}>${t}</button>`))}<button class=btn data-a=print>Imprimer / PDF</button></div>
<div class=card><div class=row><b>${E(cfg().nom).toUpperCase()}</b><b style="text-align:right">BULLETIN DU ${TR=='T1'?'1er':TR=='T2'?'2e':'3e'} TRIMESTRE</b></div><h2>${E(s.prenoms)} ${E(s.nom.toUpperCase())}</h2><small>Classe : ${E(cls(s.classe))} · Matricule : ${E(s.mat)} · Effectif : ${eff}</small>
<table style="margin-top:14px"><tr><th>Matière<th>Coef.<th>Note<th>Moy. classe<th>Appréciation${J(Object.entries(g).map(([k,a])=>`<tr><td>${E(k)}<td>${a[0].c}<td>${f1(avg(a))}<td>${f1(cm(s.classe,k,TR))}<td>${apr(avg(a))}`))}</table>
<div class=row style="margin-top:18px"><div><b>Moyenne générale</b><h2 style="color:var(--g);margin:4px 0">${f1(m)} / 20</h2></div><div>Absences : ${l.filter(r=>r.s=='A').length} séance(s)<br>Retards : ${l.filter(r=>r.s=='R').length}</div><div><b>Décision du conseil</b><h3 style="color:var(--g)">${m==null?'—':m>=14?'Admis(e) · Félicitations':m>=10?'Admis(e)':'À encourager'}</h3></div></div><p style="text-align:right" class=mut>Le directeur<br>Signature et cachet</p></div>`]};
P.finances=()=>{const s=studs(),enc=all('fee').reduce((a,f)=>a+ +f.montant,0),att=s.reduce((a,x)=>a+due(x),0),dues=s.filter(x=>bal(x)>0);
return['Frais de scolarité',`<div class="row" style="margin-bottom:16px"><div class="card kpi" style="margin:0"><b>${F(att)} FCFA</b>Attendu</div><div class="card kpi" style="margin:0"><b>${F(enc)} FCFA</b>Encaissé</div><div class="card kpi" style="margin:0;background:#fdf0e6"><b class=red>${F(att-enc)} FCFA</b>Reste à payer</div><button class=btn data-a=relance>Relancer ${dues.length} familles</button></div>
<div class=card><table><tr><th>Élève<th>Dû<th>Payé<th>Reste<th>Statut${J(s.map(x=>{const p=paid(x.id);return`<tr data-go="#/pay/${x.id}"><td>${E(x.prenoms)} ${E(x.nom)}<td>${F(due(x))}<td>${F(p)}<td>${F(due(x)-p)}<td>${due(x)-p<=0?'Soldé':p?'Partiel':'En retard'}`}))}</table></div>`]};

P.pay=id=>{const l=studs(),s=get(id)||l[0],f=get(LR),fs=f&&get(f.sid);
return['Encaissement',`<div class=row style="align-items:flex-start"><form class=card data-f=pay><h3>Nouveau paiement</h3><label>Élève</label><select name=sid data-c=paysel>${J(l.map(x=>`<option value=${x.id} ${s&&x.id==s.id?'selected':''}>${E(x.prenoms)} ${E(x.nom)} · ${E(cls(x.classe))}</option>`))}</select>
${fld(['objet','Objet'],{objet:'Scolarité'})}<label>Montant reçu (FCFA) — reste ${s?F(bal(s)):0}</label><input name=montant type=number required value="${s&&bal(s)>0?bal(s):''}">${fld(['mode','Mode de paiement','select',['Espèces','Mobile money','Virement']])}<p><button class=btn>Confirmer le paiement</button></p></form>
<div class=card id=rc><h3 style="text-align:center">REÇU DE PAIEMENT</h3>${f?`<p style="text-align:center" class=mut>N° ${f.rec} · ${f.date}</p><p>Élève<br><b>${E(fs?.prenoms)} ${E(fs?.nom)}</b></p><p>Objet<br><b>${E(f.objet)}</b></p><p>Mode<br><b>${f.mode}</b></p><h2 style="text-align:center;color:var(--g)">TOTAL PAYÉ<br>${F(f.montant)} FCFA</h2><p class="noprint" style="text-align:center"><button class="btn w" data-a=print>Imprimer</button></p>`:'<p class=mut style="text-align:center">Le reçu apparaît ici après confirmation.</p>'}</div></div>`]};

P.comm=()=>{const d=new Date(),y=d.getFullYear(),m=d.getMonth(),off=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate(),ev=new Set(all('msg').map(x=>x.date));
const dests=['Tous les parents',...all('class').map(c=>'Parents · '+c.nom),'Familles avec impayés'];
return['Communication & calendrier',`<div class=row style="align-items:flex-start"><form class=card data-f=comm><h3>Nouvelle annonce</h3>${fld(['dest','Destinataires','select',dests])}${fld(['objet','Objet'])}<label>Message</label><textarea name=texte rows=5 required></textarea>${fld(['date','Date d’envoi','date'],{date:T()})}<p><button class=btn>Programmer l’envoi</button></p></form>
<div><div class=card><h3>${d.toLocaleString('fr-FR',{month:'long',year:'numeric'})}</h3><small>L M M J V S D</small><br>${J(Array.from({length:Math.ceil((off+n)/7)*7},(_,i)=>{const k=i-off+1,ds=`${y}-${String(m+1).padStart(2,'0')}-${String(k).padStart(2,'0')}`;return`<div class="cal ${ev.has(ds)?'ev':''} ${ds==T()?'td':''}">${k>0&&k<=n?k:''}</div>`}))}</div>
<div class=card><h3>Messages récents</h3>${J(all('msg').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(x=>`<div>${x.date} · ${E(x.objet)} · <small>${E(x.dest)} · ${E(x.statut)}</small></div>`))||'<p class=mut>Aucun message.</p>'}</div></div></div><p class=mut><small>Les annonces sont enregistrées et synchronisées. L’envoi réel par SMS/WhatsApp nécessite une passerelle (voir README).</small></p>`]};

P.rapports=()=>{const f=all('fee'),mo={};f.forEach(x=>mo[x.date.slice(0,7)]=(mo[x.date.slice(0,7)]||0)+ +x.montant);const ks=Object.keys(mo).sort(),mx=Math.max(1,...Object.values(mo));let t=0,p=0,a=0,r=0;all('att').forEach(x=>Object.values(x.rows).forEach(q=>{t++;q.s=='A'?a++:q.s=='R'?r++:p++}));
const pp=t?p/t*100:100,pa=t?a/t*100:0,s=studs(),ms=s.map(x=>moy(x.id)).filter(x=>x!=null);
return['Rapports & pilotage',`<div class="row" style="margin-bottom:16px"><button class=btn data-a=exs>Exporter élèves (CSV)</button><button class=btn data-a=exf>Exporter paiements (CSV)</button></div><div class=row style="align-items:flex-start"><div class=card style="flex:2"><h3>Recettes encaissées par mois (FCFA)</h3><div class=bars>${J(ks.map(k=>`<div style="height:${mo[k]/mx*100}%">${F(mo[k])}</div>`))||'<span class=mut>Pas encore de paiement</span>'}</div><div class=row>${J(ks.map(k=>`<small>${k}</small>`))}</div></div>
<div class=card><h3>Assiduité globale</h3><div class=donut style="background:conic-gradient(var(--g) 0 ${pp}%,var(--r) ${pp}% ${pp+pa}%,var(--y) ${pp+pa}% 100%)"></div><p><small>Présents ${pp.toFixed(1)} % · Absents ${pa.toFixed(1)} %</small></p></div></div>
<div class=grid><div class="card kpi"><b>${s.length}</b>élèves</div><div class="card kpi"><b>${f1(ms.length?ms.reduce((x,y)=>x+y)/ms.length:null)} / 20</b>Moyenne générale</div><div class="card kpi"><b class=red>${F(s.reduce((x,y)=>x+Math.max(0,bal(y)),0))} FCFA</b>Impayés à recouvrer</div></div>`]};

P.params=()=>{const c=cfg();return['Paramètres & sécurité',`<div class=row style="align-items:flex-start"><div style="flex:2"><div class=card><h3>Utilisateurs</h3><table><tr><th>Utilisateur<th>Rôle<th>Statut<th>${J([])}<tbody id=us><tr><td colspan=4 class=mut>Chargement (en ligne uniquement)…</tbody></table>
${me.r=='director'?`<form data-f=user class=row style="margin-top:14px"><input name=nom placeholder="Nom" required><input name=email type=email placeholder="E-mail" required><select name=role><option value=secretariat>Secrétariat</option><option value=teacher>Enseignant</option><option value=cashier>Caissier</option><option value=librarian>Bibliothécaire</option><option value=director>Directeur</option></select><input name=password type=password placeholder="Mot de passe (8+)" minlength=8 required><button class=btn>Ajouter</button></form>`:''}</div>
<form class=card data-f=cfg><h3>Établissement</h3>${fld(['nom','Nom','text'],c)}${fld(['annee','Année scolaire'],c)}${fld(['frais','Frais de scolarité par élève (FCFA)','number'],c)}<p><button class=btn>Enregistrer</button></p></form></div>
<div class=card><h3>Synchronisation & sauvegarde</h3><p id=sy>—</p><p><button class=btn data-a=sync>Synchroniser maintenant</button></p><p><button class="btn l" data-a=exp>Exporter une sauvegarde (JSON)</button></p><p><label>Importer une sauvegarde</label><input type=file accept=.json data-c=imp></p><p><button class="btn w" data-a=demo>Charger des données de démonstration</button></p><p><button class="btn w" data-a=out>Se déconnecter</button></p></div></div>`]};
AFTER.params=async()=>{badge();$('#sy').innerHTML=$('#sb')?.textContent;if(!navigator.onLine)return;try{const r=await fetch('/api/users',{headers:{authorization:'Bearer '+tok}}),u=await r.json();$('#us').innerHTML=J(u.map(x=>`<tr><td>${E(x.nom)}<br><small>${E(x.email)}</small><td>${x.role}<td>${x.actif?'Actif':'Suspendu'}<td>${me.r=='director'&&x.id!=me.id?`<button class="btn w" data-a=tog data-id=${x.id}>${x.actif?'Suspendre':'Réactiver'}</button>`:''}`))}catch(e){}};

/* ---------- rendu ---------- */
function login(){$('#app').innerHTML=`<form class="card login" data-f=${SU?'setup':'login'}><h1>ÉcolePlus</h1><p class=mut>L’école, simplement.</p>${SU?fld(['ecole','Nom de l’établissement'])+fld(['nom','Votre nom']):''}${fld(['email','Identifiant (e-mail)','email'])}${fld(['password','Mot de passe','password'])}<p class=red id=er></p><button class=btn style="width:100%">${SU?'Créer l’établissement':'Connexion sécurisée'}</button><p><a href="#" data-a=su>${SU?'J’ai déjà un compte':'Première utilisation ? Créer l’établissement'}</a></p><small>Une connexion internet est nécessaire la première fois.</small></form>`}
function render(){if(!tok||!me)return login();const[p,a]=location.hash.slice(2).split('/'),k=a=='new'?p+'/new':p,key=P[k]?k:'dash';if(!can(p||'dash')&&p!='bulletin'&&p!='pay')return location.hash='#/dash';
const[t,h]=P[key](a);$('#app').innerHTML=`<nav><h1>ÉcolePlus</h1><small>${E(cfg().nom)}</small>${J(NAV.filter(n=>can(n[0])).map(n=>`<a href="#/${n[0]}" class="${p==n[0]||(p=='bulletin'||p=='pay')&&n[0]==(p=='pay'?'finances':'eleves')?'on':''}">${n[1]}</a>`))}</nav><main><header><h2>${t}</h2><input id=q placeholder="Rechercher un élève…" value="${E(Q)}"><span id=sb></span></header><div class=pg>${h}</div></main>`;AFTER[key]?.();badge()}

/* ---------- actions ---------- */
const H={},H2={},C={};
H.login=async o=>{try{await auth('/api/login',o);location.hash='#/dash';render();sync()}catch(e){$('#er').textContent=e||'Connexion impossible : vérifiez internet.'}};
H.setup=async o=>{try{await auth('/api/setup',o);SU=0;location.hash='#/dash';render();sync()}catch(e){$('#er').textContent=e||'Création impossible.'}};
H.enrol=async(o,fd)=>{if(step==4)o={pieces:fd.getAll('pieces')};Object.assign(W,o);localStorage.W=JSON.stringify(W);if(step==2&&!W.classe)return toast('Créez une classe d’abord');if(step<5){step++;return render()}
const id=U(),n=studs().length+1;await save('student',{nom:W.nom,prenoms:W.prenoms,naissance:W.naissance,sexe:W.sexe,lieu:W.lieu,classe:W.classe,statut:W.statut,parent:{nom:W.pnom,lien:W.plien,tel:W.ptel,adr:W.padr},pieces:W.pieces||[],mat:`EP-${String(new Date().getFullYear()).slice(2)}-${String(n).padStart(4,'0')}`},id);
if(+W.montant>0)await pay(id,W.montant,W.mode,'Inscription');W={};delete localStorage.W;step=1;toast('Élève inscrit');location.hash='#/eleves/'+id};
H.att=o=>{const rows={};studs().filter(s=>s.classe==AC).forEach(s=>rows[s.id]={s:o['s_'+s.id],h:o['h_'+s.id],m:o['m_'+s.id],p:o['p_'+s.id]?1:0});save('att',{classe:AC,date:AD,matiere:o.matiere,rows},`att:${AC}:${AD}`).then(()=>{toast('Appel validé');render()})};
H.cls=async o=>{AC=await save('class',{...o,tt:''},U());render()};
H.tt=async o=>{await save('class',{...get(AC),tt:o.tt},AC);toast('Emploi du temps enregistré');render()};
H.exam=async o=>{const id=await save('exam',{...o,notes:{}},U());location.hash='#/notes/'+id};
H.grades=async o=>{const e=get(EX),notes={};studs().filter(s=>s.classe==e.classe).forEach(s=>{const v=(o['n_'+s.id]||'').replace(',','.');if(v!=='')notes[s.id]={n:v,s:o.act=='valid'||(e.notes?.[s.id]?.s=='Validée'&&e.notes[s.id].n==v)?'Validée':'Brouillon'}});await save('exam',{...e,notes},EX);toast(o.act=='valid'?'Notes validées':'Notes enregistrées');render()};
H.pay=async o=>{if(!+o.montant)return;LR=await pay(o.sid,o.montant,o.mode,o.objet);toast('Paiement enregistré');render()};
H.comm=async o=>{await save('msg',{...o,statut:'Programmé'},U());toast('Annonce programmée');render()};
H.cfg=async o=>{await save('cfg',{...o,frais:+o.frais},'cfg');toast('Paramètres enregistrés');render()};
H.user=async o=>{const r=await fetch('/api/users',{method:'POST',headers:{authorization:'Bearer '+tok,'content-type':'application/json'},body:JSON.stringify(o)}),j=await r.json();toast(r.ok?'Utilisateur ajouté':j.error);render()};
H2.back=()=>{step--;render()};H2.print=()=>print();H2.su=()=>{SU=!SU;login()};H2.sync=()=>{localStorage.since=0;sync().then(()=>toast('Synchronisé'))};
H2.out=()=>{tok=me=null;delete localStorage.tok;delete localStorage.me;render()};
H2.tr=e=>{TR=e.dataset.id;render()};
H2.delstu=async e=>{if(confirm('Supprimer cet élève ?')){await rm(e.dataset.id);location.hash='#/eleves'}};
H2.delcls=async()=>{if(confirm('Supprimer cette classe ?')){await rm(AC);AC='';render()}};
H2.tog=async e=>{await fetch('/api/users/'+e.dataset.id+'/toggle',{method:'POST',headers:{authorization:'Bearer '+tok}});AFTER.params()};
H2.relance=async()=>{const n=studs().filter(x=>bal(x)>0).length;if(!n)return toast('Aucun impayé');await save('msg',{dest:'Familles avec impayés',objet:'Rappel paiement',texte:'Nous vous rappelons que les frais de scolarité sont à régler.',date:T(),statut:`Programmé · ${n} familles`},U());toast(`Relance programmée pour ${n} familles`)};
H2.exs=()=>dl('eleves.csv',csv([['Matricule','Nom','Prénoms','Classe','Parent','Téléphone','Solde'],...studs().map(s=>[s.mat,s.nom,s.prenoms,cls(s.classe),s.parent?.nom,s.parent?.tel,bal(s)])]));
H2.exf=()=>dl('paiements.csv',csv([['Reçu','Date','Élève','Objet','Mode','Montant'],...all('fee').map(f=>[f.rec,f.date,get(f.sid)?.nom,f.objet,f.mode,f.montant])]));
H2.exp=()=>dl('sauvegarde-ecoleplus.json',JSON.stringify(Object.values(S)),'application/json');
H2.demo=async()=>{if(all('class').length&&!confirm('Ajouter des données de démonstration ?'))return;const k=await save('class',{nom:'4e B',prof:'Mme Nkodia',salle:'B12',tt:'lundi|Mathématiques|08:00-09:30\nlundi|Français|10:00-11:30\nmardi|Histoire-Géo|08:00-09:30\nmercredi|Français|08:00-09:30\njeudi|Physique|08:00-09:30\nvendredi|Mathématiques|08:00-09:30'},U());
for(const[n,p]of[['Mabiala','Grâce Ornella'],['Moukoko','Junior'],['Bakala','Aïcha'],['Nzoulou','Chris'],['Oko','Bénie']])await save('student',{nom:n,prenoms:p,classe:k,sexe:'—',parent:{nom:'Parent de '+p,lien:'Parent',tel:'+242 06 000 00 00',adr:'Brazzaville'},pieces:PIECES.slice(0,3),mat:'EP-DEMO-'+n.slice(0,3).toUpperCase()},U());toast('Données de démonstration ajoutées');render()};
C.cf=e=>{CF=e.value;render()};C.ac=e=>{AC=e.value;render()};C.ad=e=>{AD=e.value||T();render()};C.paysel=e=>{location.hash='#/pay/'+e.value};
C.imp=async e=>{const l=JSON.parse(await e.files[0].text());for(const r of l){S[r.id]=r;await put('r',r);await put('o',r)}toast(`${l.length} enregistrements importés`);sync();render()};

document.addEventListener('submit',e=>{e.preventDefault();const f=e.target.dataset.f,fd=new FormData(e.target),o=Object.fromEntries(fd);if(e.submitter?.value)o.act=e.submitter.value;H[f]?.(o,fd)});
document.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a){e.preventDefault();return H2[a.dataset.a]?.(a)}const g=e.target.closest('[data-go]');if(g)location.hash=g.dataset.go});
document.addEventListener('change',e=>{const c=e.target.dataset.c;if(c)C[c]?.(e.target)});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.id=='q'){Q=e.target.value;location.hash='#/eleves';render()}});
(async()=>{idb=await new Promise(r=>{const q=indexedDB.open('ecoleplus',1);q.onupgradeneeded=()=>['r','o'].forEach(n=>q.result.createObjectStore(n,{keyPath:'id'}));q.onsuccess=()=>r(q.result)});
(await getAll('r')).forEach(r=>S[r.id]=r);render();sync();addEventListener('online',sync);addEventListener('offline',badge);addEventListener('hashchange',render);setInterval(sync,60000);if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js')})();
