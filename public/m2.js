/* m2 : modules 5, 6, 7 et 9 */
/* --- 5. Paiements : Mobile Money, échéancier --- */
const _pp=P.pay;P.pay=id=>{const[t,h]=_pp(id);return[t,h.replace(/<option\s*>Mobile money<\/option>/,'<option>MTN Mobile Money</option><option>Airtel Money</option>').replace('<p><button class=btn>Confirmer le paiement</button></p>',fld(['ref','Référence de la transaction (Mobile Money / virement)'])+'<p><button class=btn>Confirmer le paiement</button></p>')]};
const _hp=H.pay;H.pay=async o=>{await _hp(o);if(o.ref&&LR)await save('fee',{...get(LR),ref:o.ref},LR)};
menu('echeances','Échéancier',['secretariat','cashier']);
P.echeances=()=>{const by={};all('echeance').forEach(e=>(by[e.sid]??=[]).push(e));const t0=T();
const rows=Object.entries(by).flatMap(([sid,l])=>{let p=paid(sid);return l.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const k=Math.min(p,+e.montant);p-=k;const st=k>=+e.montant?'Payée':e.date<t0?'En retard':k?'Partielle':'À venir';return[nm(sid),E(e.libelle),e.date,F(e.montant),F(k),`<span class="${st=='En retard'?'red':''}">${st}</span>`]})});
return['Échéancier des paiements',`<form class=card data-f=ech><h3>Ajouter une tranche</h3><div class=row><div>${selStu()}</div><div>${fld(['libelle','Tranche (ex. 1re tranche)'])}</div><div>${fld(['date','Date limite','date'])}</div><div>${fld(['montant','Montant (FCFA)','number'])}</div></div><p><button class=btn>Ajouter</button></p></form><div class=card>${tbl(['Élève','Tranche','Échéance','Montant','Payé','Statut'],rows)}</div>`]};
H.ech=gen('echeance','Tranche ajoutée');

/* --- 6. Personnel et paie --- */
let MS=T().slice(0,7);
const selSt=()=>`<label>Personnel</label><select name=sid>${J(all('staff').map(s=>`<option value=${s.id}>${E(s.nom)}</option>`))}</select>`;
menu('personnel','Personnel & paie',[]);
P.personnel=()=>{const rows=all('staff').map(s=>{const h=all('heure').filter(x=>x.sid==s.id&&x.date.startsWith(MS)).reduce((a,x)=>a+ +x.h,0),av=all('avance').filter(x=>x.sid==s.id&&x.date.startsWith(MS)).reduce((a,x)=>a+ +x.montant,0),br=s.type=='Permanent'?+s.sal:+s.sal*h;return[E(s.nom),s.type,E(s.matiere),h,F(br),F(av),`<b>${F(br-av)}</b>`]});
return['Personnel & paie',`<div class=row style="align-items:flex-start"><form class=card data-f=staff><h3>Nouveau membre</h3>${fld(['nom','Nom et prénoms'])}${fld(['tel','Téléphone','tel'])}${fld(['type','Statut','select',['Permanent','Vacataire']])}${fld(['matiere','Matière / fonction'])}${fld(['sal','Salaire mensuel (permanent) ou taux horaire (vacataire), en FCFA','number'])}<p><button class=btn>Ajouter</button></p></form>
<div><form class=card data-f=heure><h3>Heures effectuées</h3>${selSt()}${fld(['date','Date','date'],{date:T()})}${fld(['h','Nombre d’heures','number'])}<p><button class=btn>Enregistrer</button></p></form><form class=card data-f=avance><h3>Avance sur salaire</h3>${selSt()}${fld(['date','Date','date'],{date:T()})}${fld(['montant','Montant (FCFA)','number'])}<p><button class=btn>Enregistrer</button></p></form></div></div>
<div class=card><div class=row><h3>Paie du mois</h3><input type=month value=${MS} data-c=ms style="max-width:200px"></div>${tbl(['Nom','Statut','Fonction','Heures','Brut','Avances','Net à payer'],rows)}</div>`]};
H.staff=gen('staff','Personnel ajouté');H.heure=gen('heure','Heures enregistrées');H.avance=gen('avance','Avance enregistrée');C.ms=e=>{MS=e.value||MS;render()};

/* --- 7. Vie scolaire : discipline, cahier de textes, conseil de classe --- */
menu('discipline','Vie scolaire',['secretariat','teacher']);
P.discipline=()=>['Vie scolaire',`<div class=row style="align-items:flex-start"><form class=card data-f=disc><h3>Fait disciplinaire</h3>${selStu()}${fld(['type','Nature','select',['Retard','Absence injustifiée','Avertissement','Blâme','Exclusion temporaire','Conseil de discipline']])}${fld(['motif','Motif'])}${fld(['decision','Décision / sanction'])}${fld(['date','Date','date'],{date:T()})}<p><button class=btn>Enregistrer</button></p></form>
<form class=card data-f=texte><h3>Cahier de textes</h3>${fld(['classe','Classe','classe'])}${fld(['matiere','Matière'])}${fld(['date','Date','date'],{date:T()})}<label>Contenu du cours / devoirs</label><textarea name=contenu rows=4></textarea><p><button class=btn>Enregistrer</button></p></form>
<form class=card data-f=conseil><h3>Conseil de classe</h3>${fld(['classe','Classe','classe'])}${fld(['tr','Trimestre','select',TRS])}<label>Procès-verbal</label><textarea name=pv rows=4></textarea><p><button class=btn>Enregistrer</button></p></form></div>
<div class=card><h3>Faits disciplinaires récents</h3>${tbl(['Date','Élève','Nature','Motif','Décision'],all('disc').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15).map(x=>[x.date,nm(x.sid),x.type,E(x.motif),E(x.decision)]))}</div>
<div class=card><h3>Cahier de textes récent</h3>${tbl(['Date','Classe','Matière','Contenu'],all('texte').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(x=>[x.date,E(cls(x.classe)),E(x.matiere),E(x.contenu)]))}</div>
<div class=card><h3>Conseils de classe</h3>${tbl(['Classe','Trim.','Procès-verbal'],all('conseil').map(x=>[E(cls(x.classe)),x.tr,E(x.pv)]))}</div>`];
H.disc=gen('disc');H.texte=gen('texte');H.conseil=gen('conseil');

/* --- 9. Comptabilité simple --- */
menu('compta','Comptabilité',['cashier']);
P.compta=()=>{const fe=all('fee'),dp=all('dep'),mo={};fe.forEach(x=>{(mo[x.date.slice(0,7)]??=[0,0])[0]+=+x.montant});dp.forEach(x=>{(mo[x.date.slice(0,7)]??=[0,0])[1]+=+x.montant});const R=fe.reduce((a,x)=>a+ +x.montant,0),D=dp.reduce((a,x)=>a+ +x.montant,0);
return['Comptabilité',`<div class=grid><div class="card kpi"><b>${F(R)}</b>Recettes (FCFA)</div><div class="card kpi"><b class=red>${F(D)}</b>Dépenses</div><div class="card kpi mint"><b>${F(R-D)}</b>Solde de caisse</div></div>
<form class=card data-f=dep><h3>Nouvelle dépense</h3><div class=row><div>${fld(['date','Date','date'],{date:T()})}</div><div>${fld(['cat','Catégorie','select',['Salaires','Électricité / eau','Fournitures','Entretien','Loyer / impôts','Autres']])}</div><div>${fld(['libelle','Libellé'])}</div><div>${fld(['montant','Montant (FCFA)','number'])}</div></div><p><button class=btn>Enregistrer</button> <button type=button class="btn w" data-a=exdep>Exporter (CSV)</button></p></form>
<div class=card><h3>Bilan mensuel</h3>${tbl(['Mois','Recettes','Dépenses','Solde'],Object.keys(mo).sort().map(k=>[k,F(mo[k][0]),F(mo[k][1]),F(mo[k][0]-mo[k][1])]))}</div>
<div class=card><h3>Dernières dépenses</h3>${tbl(['Date','Catégorie','Libellé','Montant'],dp.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(x=>[x.date,x.cat,E(x.libelle),F(x.montant)]))}</div>`]};
H.dep=gen('dep','Dépense enregistrée');
H2.exdep=()=>dl('depenses.csv',csv([['Date','Catégorie','Libellé','Montant'],...all('dep').map(x=>[x.date,x.cat,x.libelle,x.montant])]));
