/* m-eleves.js : module Élèves (répertoire, fiche, inscription) */
(function () {
  var UI = EP.UI, DB = EP.DB, h = UI.h;
  var sel = null;

  var ETAPES = [
    { titre: 'Identité', champs: [
      { k: 'nom', l: 'Nom', req: 1 },
      { k: 'prenoms', l: 'Prénom(s)', req: 1 },
      { k: 'naissance', l: 'Date de naissance', t: 'date' },
      { k: 'sexe', l: 'Sexe', o: ['Féminin', 'Masculin'] },
      { k: 'lieu', l: 'Lieu de naissance' }
    ] },
    { titre: 'Classe', champs: [
      { k: 'classeId', l: 'Classe', o: 'classes', req: 1 }
    ] },
    { titre: 'Parents', champs: [
      { k: 'parentNom', l: 'Nom du parent ou tuteur' },
      { k: 'parentLien', l: 'Lien avec l’élève', o: ['Mère', 'Père', 'Tuteur'] },
      { k: 'parentTel', l: 'Téléphone', t: 'tel' },
      { k: 'adresse', l: 'Adresse' }
    ] },
    { titre: 'Pièces', pieces: ['Acte de naissance', 'Certificat de scolarité', 'Photo d’identité', 'Bulletin précédent'] }
  ];

  function nomClasse(id) { var c = DB.trouver('classes', id); return c ? c.nom : 'Sans classe'; }
  function nomComplet(e) { return e.prenoms + ' ' + e.nom.toUpperCase(); }
  function dateFr(d) { return d ? d.split('-').reverse().join('/') : '—'; }

  function nouveauMatricule() {
    var an = String(new Date().getFullYear()).slice(2), max = 0;
    DB.liste('eleves').forEach(function (e) {
      var n = parseInt(String(e.matricule).split('-')[2], 10);
      if (n > max) max = n;
    });
    return 'EP-' + an + '-' + String(max + 1).padStart(4, '0');
  }

  /* ---------- RÉPERTOIRE ---------- */
  function repertoire(vue) {
    vue.innerHTML = '';
    UI.$('titre').textContent = 'Répertoire des élèves';
    var q = '', cl = '';

    var champQ = h('input', { class: 'champ', placeholder: 'Rechercher par nom ou matricule' });
    var listeCl = h('select', { class: 'champ' }, [h('option', { value: '' }, 'Toutes les classes')]
      .concat(DB.liste('classes').map(function (c) { return h('option', { value: c.id }, c.nom); })));
    var colListe = h('div', { class: 'panneau' });
    var colFiche = h('div', { class: 'panneau' });

    function dessiner() {
      var tous = DB.liste('eleves');
      var vus = tous.filter(function (e) {
        var texte = (e.nom + ' ' + e.prenoms + ' ' + e.matricule).toLowerCase();
        return texte.indexOf(q.toLowerCase()) >= 0 && (!cl || e.classeId === cl);
      });
      if (!DB.trouver('eleves', sel) && vus.length) sel = vus[0].id;

      colListe.innerHTML = '';
      colListe.appendChild(h('h3', {}, vus.length + ' élève' + (vus.length > 1 ? 's' : '')));
      if (!vus.length) {
        colListe.appendChild(h('p', { class: 'muted' }, tous.length ? 'Aucun résultat.' : 'Aucun élève inscrit pour le moment.'));
      }
      vus.forEach(function (e) {
        colListe.appendChild(h('div', {
          class: 'ligne' + (e.id === sel ? ' actif' : ''),
          onclick: function () { sel = e.id; dessiner(); }
        }, [
          h('strong', {}, nomComplet(e)),
          h('span', { class: 'muted' }, nomClasse(e.classeId))
        ]));
      });
      fiche();
    }

    function fiche() {
      colFiche.innerHTML = '';
      var e = DB.trouver('eleves', sel);
      if (!e) {
        colFiche.appendChild(h('p', { class: 'muted' }, 'Inscrivez un premier élève avec le bouton « Nouvelle inscription ».'));
        return;
      }
      var recues = e.pieces || [];
      colFiche.appendChild(h('h2', {}, e.prenoms + ' ' + e.nom));
      colFiche.appendChild(h('p', { class: 'muted' }, [e.matricule, nomClasse(e.classeId), e.statut].join(' · ')));
      colFiche.appendChild(h('div', { class: 'deux' }, [
        h('div', {}, [
          h('h3', {}, 'Identité'),
          h('p', {}, 'Né(e) le ' + dateFr(e.naissance)),
          h('p', {}, 'À ' + (e.lieu || '—')),
          h('p', {}, 'Sexe : ' + (e.sexe || '—'))
        ]),
        h('div', {}, [
          h('h3', {}, 'Contacts'),
          h('p', {}, (e.parentNom || '—') + (e.parentLien ? ' — ' + e.parentLien : '')),
          h('p', {}, e.parentTel || '—'),
          h('p', {}, e.adresse || '—')
        ])
      ]));
      colFiche.appendChild(h('h3', { style: 'margin-bottom:8px' }, 'Documents'));
      ETAPES[3].pieces.forEach(function (p) {
        colFiche.appendChild(h('p', {}, (recues.indexOf(p) >= 0 ? '✓ ' : '• ') + p));
      });
      colFiche.appendChild(h('div', { class: 'barre-actions' }, [
        h('button', { class: 'btn btn-clair', onclick: function () {
          if (!confirm('Retirer ' + nomComplet(e) + ' du répertoire ?')) return;
          DB.supprimer('eleves', e.id);
          sel = null;
          dessiner();
        } }, 'Retirer l’élève')
      ]));
    }

    champQ.addEventListener('input', function () { q = champQ.value; dessiner(); });
    listeCl.addEventListener('change', function () { cl = listeCl.value; dessiner(); });

    vue.appendChild(h('div', { class: 'panneau barre' }, [
      champQ, listeCl,
      h('button', { class: 'btn', onclick: function () { inscription(vue); } }, 'Nouvelle inscription')
    ]));
    vue.appendChild(h('div', { class: 'deux-col' }, [colListe, colFiche]));
    dessiner();
  }

  /* ---------- INSCRIPTION ---------- */
  function inscription(vue) {
    UI.$('titre').textContent = 'Nouvelle inscription';
    var d = { sexe: 'Féminin', parentLien: 'Mère', pieces: {} };
    var etape = 0;

    function champ(f) {
      var el;
      if (f.o) {
        var opts = f.o === 'classes'
          ? DB.liste('classes').map(function (c) { return [c.id, c.nom]; })
          : f.o.map(function (x) { return [x, x]; });
        el = h('select', { class: 'champ' }, [h('option', { value: '' }, 'Choisir…')]
          .concat(opts.map(function (o) { return h('option', { value: o[0] }, o[1]); })));
      } else {
        el = h('input', { class: 'champ', type: f.t || 'text' });
      }
      el.value = d[f.k] || '';
      var maj = function () { d[f.k] = el.value; };
      el.addEventListener('input', maj);
      el.addEventListener('change', maj);
      return h('div', { class: 'groupe' }, [h('label', {}, f.l), el]);
    }

    function valide() {
      var manque = (ETAPES[etape].champs || []).filter(function (f) {
        return f.req && !String(d[f.k] || '').trim();
      });
      if (manque.length) {
        UI.toast('À renseigner : ' + manque.map(function (f) { return f.l; }).join(', '));
        return false;
      }
      return true;
    }

    function enregistrer() {
      if (!valide()) return;
      var rec = DB.ajouter('eleves', {
        matricule: nouveauMatricule(),
        nom: d.nom.trim(), prenoms: d.prenoms.trim(),
        naissance: d.naissance || '', sexe: d.sexe || '', lieu: (d.lieu || '').trim(),
        classeId: d.classeId, statut: 'Actif',
        parentNom: (d.parentNom || '').trim(), parentLien: d.parentLien || '',
        parentTel: (d.parentTel || '').trim(), adresse: (d.adresse || '').trim(),
        pieces: Object.keys(d.pieces).filter(function (p) { return d.pieces[p]; })
      });
      sel = rec.id;
      UI.toast('Élève inscrit : ' + rec.matricule);
      repertoire(vue);
    }

    function dessiner() {
      vue.innerHTML = '';
      var e = ETAPES[etape];
      vue.appendChild(h('div', { class: 'pastilles' }, ETAPES.map(function (x, i) {
        return h('span', { class: 'pastille' + (i === etape ? ' actif' : '') }, (i + 1) + ' ' + x.titre);
      })));

      var corps;
      if (e.pieces) {
        corps = h('div', { class: 'formulaire' }, e.pieces.map(function (p) {
          var c = h('input', { type: 'checkbox' });
          c.checked = !!d.pieces[p];
          c.addEventListener('change', function () { d.pieces[p] = c.checked; });
          return h('label', { class: 'case' }, [c, ' ' + p]);
        }));
      } else if (e.champs[0].o === 'classes' && !DB.compter('classes')) {
        corps = h('p', { class: 'muted' }, 'Aucune classe n’existe encore. Créez d’abord une classe dans le menu Classes.');
      } else {
        corps = h('div', { class: 'formulaire' }, e.champs.map(champ));
      }

      var actions = [];
      if (etape > 0) {
        actions.push(h('button', { class: 'btn btn-blanc', onclick: function () { etape--; dessiner(); } }, 'Retour'));
      } else {
        actions.push(h('button', { class: 'btn btn-blanc', onclick: function () { repertoire(vue); } }, 'Annuler'));
      }
      if (etape < ETAPES.length - 1) {
        actions.push(h('button', { class: 'btn', onclick: function () {
          if (valide()) { etape++; dessiner(); }
        } }, 'Continuer →'));
      } else {
        actions.push(h('button', { class: 'btn', onclick: enregistrer }, 'Enregistrer l’élève'));
      }
      vue.appendChild(h('div', { class: 'panneau', style: 'margin-top:0' }, [
        h('h3', {}, e.titre),
        corps,
        h('div', { class: 'barre-actions' }, actions)
      ]));
    }

    dessiner();
  }

  EP.vues.eleves = repertoire;
})();
