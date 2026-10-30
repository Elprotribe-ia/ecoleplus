/* m1 : modules 1 à 4 */
const nm=id=>{const s=get(id);return s?E(s.prenoms+' '+s.nom):'—'};
const tbl=(h,r)=>`<table><tr>${J(h.map(x=>`<th>${x}`))}${J(r.map(l=>`<tr>${J(l.map(c=>`<td>${c}`))}`))}</table>`;
const selStu=()=>`<label>Élève</label><select name=sid>${J(studs().map(s=>`<option value=${s.id}>${E(s.nom)} ${E(s.prenoms)} · ${E(cls(s.classe))}</option>`))}</select>`;
const acc=(k,r)=>r.forEach(x=>ACC[x]=(ACC[x]||'')+' '+k),menu=(k,t,r)=>{NAV.push([k,t]);acc(k,r)};
const gen=(t,m)=>async o=>{await save(t,o,U());toast(m||'Enregistré');render()};
const CYC=['Primaire','Collège','Lycée'],SER=['—','A','C','D','G1','G2','F','Autre'];
acc('fiche',['secretariat']);acc('docs',['secretariat']);acc('parent',['secretariat']);

/* --- 1. Fiche élève complète --- */
const _el=P.eleves;P.eleves=id=>{const[t,h]=_el(id);return[t,h.replace(/(<button class="btn w" data-a=delstu data-id=([^>\s]+)>)/,'<a class="btn l" href="#/fiche/$2">Modifier la fiche</a><a class="btn w" href="#/docs/$2">Documents</a><a class="btn w" href="#/parent/$2">Fiche parent</a>$1')]};
P.fiche=id=>{const s=get(id);if(!s)return['Fiche élève','<p>Élève introuvable.</p>'];const p=s.parent||{};
return['Fiche — '+E(s.prenoms),`<form class=card data-f=fiche><input type=hidden name=id value=${id}><div class=row style="align-items:flex-start"><div>${fld(['nom','Nom'],s)}${fld(['prenoms','Prénom(s)'],s)}${fld(['naissance','Date de naissance','date'],s)}${fld(['sexe','Sexe','select',['Féminin','Masculin']],s)}${fld(['lieu','Lieu de naissance'],s)}</div><div>${fld(['classe','Classe','classe'],s)}${fld(['pnom','Parent / tuteur'],{pnom:p.nom})}${fld(['ptel','Téléphone','tel'],{ptel:p.tel})}${fld(['padr','Adresse'],{padr:p.adr})}${fld(['reduc','Réduction des frais (%) : fratrie, orphelin, bourse','number'],s)}${fld(['motifred','Motif de la réduction'],s)}</div></div><p><button class=btn>Enregistrer</button> <a class="btn w" href="#/eleves/${id}">Retour</a></p></form>
<form class=card data-f=sortie><input type=hidden name=id value=${id}><h3>Redoublement, transfert ou départ</h3><div class=row><div>${fld(['type','Situation','select',['Redoublement','Transfert','Abandon','Exclusion','Diplômé']])}</div><div>${fld(['motif','Motif / établissement d’accueil'])}</div></div><p><button class="btn l">Valider</button></p></form>
<div class=card><h3>Historique scolaire</h3>${tbl(['Année','Classe','Décision'],(s.hist||[]).map(h=>[E(h.annee),E(h.classe),E(h.dec)]))}</div>`]};
H.fiche=async o=>{const s=get(o.id),r=+o.reduc||0;await save('student',{...s,nom:o.nom,prenoms:o.prenoms,naissance:o.naissance,sexe:o.sexe,lieu:o.lieu,classe:o.classe,parent:{...s.parent,nom:o.pnom,tel:o.ptel,adr:o.padr},reduc:r,motifred:o.motifred,frais:r?Math.round(+cfg().frais*(1-r/100)):undefined},o.id);toast('Fiche mise à jour');location.hash='#/eleves/'+o.id};
H.sortie=async o=>{const s=get(o.id),hist=[...(s.hist||[]),{annee:cfg().annee,classe:cls(s.classe),dec:o.type+(o.motif?' : '+o.motif:'')}];await save('student',{...s,hist,...(o.type=='Redoublement'?{redouble:1}:{sortie:{type:o.type,motif:o.motif,date:T()}})},o.id);toast('Enregistré');location.hash='#/eleves'};
menu('fin','Fin d’année',['secretariat']);
P.fin=()=>['Fin d’année scolaire',`<form class=card data-f=promo><h3>Passage en classe supérieure</h3><p class=mut>Les élèves marqués « redoublement » restent dans leur classe. Les autres passent dans la classe d’accueil.</p>${fld(['de','Classe actuelle','classe'])}${fld(['vers','Classe d’accueil','classe'])}<p><button class=btn>Faire passer la classe</button></p></form><p class=mut>Ensuite, changez l’année scolaire dans Paramètres.</p>`];
H.promo=async o=>{if(o.de==o.vers||!confirm('Confirmer le passage de classe ?'))return;let n=0;for(const s of studs().filter(x=>x.classe==o.de)){const h=[...(s.hist||[])];if(s.redouble){h.push({annee:cfg().annee,classe:cls(o.de),dec:'Redouble'});await save('student',{...s,hist:h,redouble:0},s.id)}else{h.push({annee:cfg().annee,classe:cls(o.de),dec:'Admis en '+cls(o.vers)});await save('student',{...s,hist:h,classe:o.vers},s.id);n++}}toast(n+' élèves passés en '+cls(o.vers));render()};

/* --- 2. Cycles, séries, coefficients --- */
menu('matieres','Matières & coefs',['secretariat','teacher']);
P.matieres=()=>{const cl=all('class');AC=get(AC)?AC:cl[0]?.id;const c=get(AC)||{},ms=all('mat').filter(x=>x.classe==AC);
return['Cycles, séries & coefficients',`<div class=row>${clsSel(AC,'ac')}</div><form class=card data-f=clsinfo style="margin-top:16px"><h3>${E(c.nom)}</h3><div class=row><div>${fld(['cycle','Cycle','select',CYC],c)}</div><div>${fld(['serie','Série','select',SER],c)}</div></div><p><button class=btn>Enregistrer</button></p></form>
<form class=card data-f=mat><h3>Ajouter une matière</h3><div class=row><div>${fld(['nom','Matière'])}</div><div>${fld(['coef','Coefficient','number'])}</div></div><p><button class=btn>Ajouter</button> <button type=button class="btn w" data-a=applycoef>Appliquer aux évaluations</button></p></form>
<div class=card>${tbl(['Matière','Coef.',''],ms.map(m=>[E(m.nom),m.coef,`<button class="btn w" data-a=delmat data-id=${m.id}>Supprimer</button>`]))}</div>`]};
H.clsinfo=async o=>{await save('class',{...get(AC),cycle:o.cycle,serie:o.serie},AC);toast('Classe mise à jour');render()};
H.mat=async o=>{await save('mat',{classe:AC,nom:o.nom,coef:+o.coef||1},U());render()};
H2.delmat=e=>rm(e.dataset.id).then(render);
H2.applycoef=async()=>{let n=0;for(const e of all('exam')){const m=all('mat').find(x=>x.classe==e.classe&&x.nom.toLowerCase()==(e.matiere||'').toLowerCase());if(m&&+e.coef!=m.coef){await save('exam',{...e,coef:m.coef},e.id);n++}}toast(n+' évaluations mises à jour');render()};

/* --- 3. Examens officiels (CEPE, BEPC, Bac) --- */
menu('examens','Examens officiels',['secretariat']);
P.examens=()=>{const c=all('cand').sort((a,b)=>a.num.localeCompare(b.num));
return['Examens officiels',`<form class=card data-f=cand><h3>Inscrire un candidat</h3><div class=row><div>${selStu()}</div><div>${fld(['exam','Examen','select',['CEPE','BEPC','BAC']])}</div><div>${fld(['serie','Série (Bac)','select',SER])}</div><div>${fld(['centre','Centre d’examen'])}</div></div><p><button class=btn>Inscrire</button></p></form>
<div class=card><div class=row><h3>Candidats (${c.length})</h3><button class=btn data-a=excand>Exporter (CSV)</button></div>${tbl(['N°','Candidat','Examen','Série','Centre','Résultat'],c.map(x=>[x.num,nm(x.sid),x.exam,x.serie,E(x.centre),`<select data-c=res data-id=${x.id}>${J(['En attente','Admis','Ajourné','Admis avec mention'].map(r=>`<option ${x.res==r?'selected':''}>${r}</option>`))}</select>`]))}</div>`]};
H.cand=async o=>{const n=all('cand').filter(x=>x.exam==o.exam).length+1;await save('cand',{...o,annee:cfg().annee,num:o.exam+'-'+String(n).padStart(4,'0'),res:'En attente'},U());toast('Candidat inscrit');render()};
C.res=e=>save('cand',{...get(e.dataset.id),res:e.value},e.dataset.id);
H2.excand=()=>dl('candidats.csv',csv([['N°','Candidat','Examen','Série','Centre','Résultat'],...all('cand').map(x=>[x.num,get(x.sid)?.nom+' '+get(x.sid)?.prenoms,x.exam,x.serie,x.centre,x.res])]));

/* --- 4. Documents officiels --- */
let DT='certificat';
const _cl=P.classes;P.classes=id=>{const[t,h]=_cl(id);return[t,h.replace('<form class=card data-f=tt>',`<p><a class="btn w" href="#/docs/${AC}">Imprimer la liste de classe</a></p><form class=card data-f=tt>`)]};
P.docs=id=>{if(S[id]?.type=='class'){const c=get(id),l=studs().filter(s=>s.classe==id);return['Liste de classe',`<div class=noprint><button class=btn data-a=print>Imprimer</button></div><div class=card><h2>${E(cfg().nom)} : ${E(c.nom)} · ${E(cfg().annee)}</h2>${tbl(['N°','Matricule','Nom et prénoms','Sexe','Né(e) le'],l.map((s,i)=>[i+1,E(s.mat),E(s.nom.toUpperCase()+' '+s.prenoms),E(s.sexe),E(s.naissance)]))}</div>`]}
const s=get(id);if(!s)return['Documents','<p>Élève introuvable.</p>'];const c=cfg(),d=new Date().toLocaleDateString('fr-FR'),who=E(s.prenoms)+' '+E(s.nom.toUpperCase()),nais=`né(e) le ${E(s.naissance)} à ${E(s.lieu)}`;
const D={certificat:`<h2 style="text-align:center">CERTIFICAT DE SCOLARITÉ</h2><p>Le Directeur de ${E(c.nom)} certifie que l’élève <b>${who}</b>, ${nais}, matricule ${E(s.mat)}, est régulièrement inscrit(e) en classe de <b>${E(cls(s.classe))}</b> pour l’année scolaire ${E(c.annee)}.</p><p>Le présent certificat est délivré pour servir et valoir ce que de droit.</p>`,
attestation:`<h2 style="text-align:center">ATTESTATION D’INSCRIPTION</h2><p>Nous attestons que <b>${who}</b>, ${nais}, est inscrit(e) à ${E(c.nom)} en classe de <b>${E(cls(s.classe))}</b>, année scolaire ${E(c.annee)}. Parent / tuteur : ${E(s.parent?.nom)}.</p>`,
carte:`<div style="border:2px solid var(--n);max-width:380px;padding:16px"><b>${E(c.nom)}</b><br><small>CARTE SCOLAIRE ${E(c.annee)}</small><h2>${who}</h2>Matricule : ${E(s.mat)}<br>Classe : ${E(cls(s.classe))}<br>${nais}</div>`};
return['Documents officiels',`<div class="row noprint" style="margin-bottom:12px">${J([['certificat','Certificat de scolarité'],['attestation','Attestation d’inscription'],['carte','Carte scolaire']].map(([k,l])=>`<button class="pill ${DT==k?'on':''}" data-a=dt data-id=${k}>${l}</button>`))}<button class=btn data-a=print>Imprimer</button></div><div class=card>${D[DT]}${DT=='carte'?'':`<p style="margin-top:30px">Fait à Brazzaville, le ${d}</p><p style="text-align:right">Le Directeur<br>Signature et cachet</p>`}</div>`]};
H2.dt=e=>{DT=e.dataset.id;render()};
