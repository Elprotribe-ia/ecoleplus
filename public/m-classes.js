/* m-classes.js : module Classes & emploi du temps */
(function () {
  var UI = EP.UI, DB = EP.DB, h = UI.h;
  var JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var CYCLES = ['Primaire', 'Collège', 'Lycée'];
  var choisie = null;

  function saisie(id, type, ph) {
    return h('input', { id: id, type: type || 'text', class: 'champ', placeholder: ph || '' });
  }
  function liste(id, options) {
    return h('select', { id: id, class: 'champ' }, options.map(function (o) {
      return h('option', { value: o }, o);
    }));
  }
  function champ(label, el) {
    return h('div', { class: 'groupe' }, [h('label', {}, label), el]);
  }
  function rafraichir() {
    var v = UI.$('vue');
    v.innerHTML = '';
    EP.vues.classes(v);
  }

  EP.vues.classes = function (vue) {
    var classes = DB.liste('classes');
    var c = DB.trouver('classes', choisie) || classes[0] || null;
    choisie = c ? c.id : null;

    if (classes.length) {
      vue.appendChild(h('div', { class: 'pastilles' }, classes.map(function (x) {
        return h('button', {
          class: 'pastille' + (x.id === choisie ? ' actif' : ''),
          onclick: function () { choisie = x.id; rafraichir(); }
        }, x.nom);
      })));
    } else {
      vue.appendChild(h('p', { class: 'muted' }, 'Aucune classe pour le moment. Créez la première ci-dessous.'));
    }
    if (c) detail(vue, c);
    vue.appendChild(formClasse());
  };

  function detail(vue, c) {
    var effectif = DB.liste('eleves').filter(function (e) { return e.classeId === c.id; }).length;
    var infos = [
      c.cycle,
      c.serie ? 'Série ' + c.serie : '',
      effectif + ' élève' + (effectif > 1 ? 's' : ''),
      c.prof ? 'Prof. principal : ' + c.prof : '',
      c.salle ? 'Salle ' + c.salle : ''
    ].filter(Boolean).join(' · ');

    vue.appendChild(h('div', { class: 'panneau', style: 'margin-top:0' }, [
      h('h2', {}, c.nom),
      h('p', { class: 'muted', style: 'margin:6px 0 14px' }, infos),
      h('button', { class: 'btn btn-clair', onclick: function () {
        if (effectif > 0) { UI.toast('Retirez d’abord les élèves de cette classe'); return; }
        if (!confirm('Supprimer la classe ' + c.nom + ' ?')) return;
        DB.supprimer('classes', c.id);
        choisie = null;
        rafraichir();
      } }, 'Supprimer la classe')
    ]));

    vue.appendChild(h('h3', { style: 'margin:24px 0 12px' }, 'Emploi du temps'));
    vue.appendChild(h('div', { class: 'edt' }, JOURS.map(function (j) {
      var creneaux = (c.edt || [])
        .filter(function (x) { return x.jour === j; })
        .sort(function (a, b) { return a.debut < b.debut ? -1 : 1; });
      return h('div', { class: 'jour' }, [h('h4', {}, j)].concat(creneaux.map(function (x) {
        return h('div', { class: 'creneau' }, [
          h('strong', {}, x.matiere),
          h('span', { class: 'muted' }, x.debut + ' — ' + x.fin),
          h('button', { class: 'lien', onclick: function () { retirer(c, x.id); } }, 'Retirer')
        ]);
      })));
    })));
    vue.appendChild(formCreneau(c));
  }

  function retirer(c, id) {
    DB.modifier('classes', c.id, {
      edt: (c.edt || []).filter(function (x) { return x.id !== id; })
    });
    rafraichir();
  }

  function formCreneau(c) {
    var jour = liste('cr-jour', JOURS);
    var mat = saisie('cr-mat', 'text', 'Ex. Mathématiques');
    var deb = saisie('cr-deb', 'time');
    var fin = saisie('cr-fin', 'time');
    return h('div', { class: 'panneau' }, [
      h('h3', {}, 'Ajouter un cours'),
      h('div', { class: 'formulaire' }, [champ('Jour', jour), champ('Matière', mat), champ('Début', deb), champ('Fin', fin)]),
      h('button', { class: 'btn', onclick: function () {
        if (!mat.value.trim() || !deb.value || !fin.value) { UI.toast('Indiquez la matière et les horaires'); return; }
        if (fin.value <= deb.value) { UI.toast('L’heure de fin doit être après le début'); return; }
        var edt = (c.edt || []).concat([{
          id: 'c' + Date.now(), jour: jour.value, matiere: mat.value.trim(), debut: deb.value, fin: fin.value
        }]);
        DB.modifier('classes', c.id, { edt: edt });
        UI.toast('Cours ajouté');
        rafraichir();
      } }, 'Ajouter le cours')
    ]);
  }

  function formClasse() {
    var nom = saisie('cl-nom', 'text', 'Ex. 4e B');
    var cycle = liste('cl-cycle', CYCLES);
    var serie = saisie('cl-serie', 'text', 'A, C, D…');
    var prof = saisie('cl-prof');
    var salle = saisie('cl-salle');
    return h('div', { class: 'panneau' }, [
      h('h3', {}, 'Nouvelle classe'),
      h('div', { class: 'formulaire' }, [
        champ('Nom de la classe', nom),
        champ('Cycle', cycle),
        champ('Série (lycée)', serie),
        champ('Professeur principal', prof),
        champ('Salle', salle)
      ]),
      h('button', { class: 'btn', onclick: function () {
        if (!nom.value.trim()) { UI.toast('Indiquez le nom de la classe'); return; }
        var rec = DB.ajouter('classes', {
          nom: nom.value.trim(), cycle: cycle.value, serie: serie.value.trim(),
          prof: prof.value.trim(), salle: salle.value.trim(), edt: []
        });
        choisie = rec.id;
        UI.toast('Classe ajoutée');
        rafraichir();
      } }, 'Ajouter la classe')
    ]);
  }
})();
