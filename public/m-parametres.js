/* m-parametres.js : comptes et espaces (réservé à la direction) */
(function () {
  var UI = EP.UI, DB = EP.DB, h = UI.h;

  function rafraichir() {
    var v = UI.$('vue');
    v.innerHTML = '';
    EP.vues.parametres(v);
  }
  function nomClasse(id) { var c = DB.trouver('classes', id); return c ? c.nom : '?'; }
  function nomEleve(id) { var e = DB.trouver('eleves', id); return e ? e.prenoms + ' ' + e.nom : '?'; }

  function lien(c) {
    if (c.role === 'enseignant') return (c.classeIds || []).map(nomClasse).join(', ') || '—';
    if (c.role === 'parent') return (c.eleveIds || []).map(nomEleve).join(', ') || '—';
    if (c.role === 'eleve') return c.eleveId ? nomEleve(c.eleveId) : '—';
    return '—';
  }

  function supprimer(c) {
    var moi = EP.session();
    var directions = DB.liste('comptes').filter(function (x) { return x.role === 'direction'; });
    if (moi && moi.id === c.id) { UI.toast('Vous ne pouvez pas supprimer votre propre compte'); return; }
    if (c.role === 'direction' && directions.length <= 1) { UI.toast('Il faut garder au moins un compte direction'); return; }
    if (!confirm('Supprimer le compte de ' + c.nom + ' ?')) return;
    DB.supprimer('comptes', c.id);
    rafraichir();
  }

  function changerMdp(c) {
    var m = prompt('Nouveau mot de passe pour ' + c.nom + ' (4 caractères minimum)');
    if (m === null) return;
    if (m.length < 4) { UI.toast('Mot de passe trop court'); return; }
    DB.modifier('comptes', c.id, { mdp: m });
    UI.toast('Mot de passe modifié');
  }

  function tableComptes() {
    var lignes = DB.liste('comptes').map(function (c) {
      return h('tr', {}, [
        h('td', {}, c.nom),
        h('td', {}, c.identifiant),
        h('td', {}, EP.ROLES[c.role] || c.role),
        h('td', {}, lien(c)),
        h('td', {}, [
          h('button', { class: 'lien', style: 'color:#17876b;margin-right:12px', onclick: function () { changerMdp(c); } }, 'Mot de passe'),
          h('button', { class: 'lien', onclick: function () { supprimer(c); } }, 'Supprimer')
        ])
      ]);
    });
    return h('table', {}, [
      h('thead', {}, [h('tr', {}, ['Nom', 'Identifiant', 'Espace', 'Relié à', ''].map(function (t) { return h('th', {}, t); }))]),
      h('tbody', {}, lignes)
    ]);
  }

  function formCompte() {
    var nom = h('input', { class: 'champ', placeholder: 'Ex. Mme Nkodia' });
    var ident = h('input', { class: 'champ', placeholder: 'Ex. nkodia' });
    var mdp = h('input', { class: 'champ', type: 'text', placeholder: '4 caractères minimum' });
    var role = h('select', { class: 'champ' }, Object.keys(EP.ROLES).map(function (k) {
      return h('option', { value: k }, EP.ROLES[k]);
    }));
    var zone = h('div', { class: 'formulaire' });
    var cases = [];
    var choixEleve = null;

    function dessinerZone() {
      zone.innerHTML = '';
      cases = [];
      choixEleve = null;
      var r = role.value;
      if (r === 'enseignant' || r === 'parent') {
        var items = r === 'enseignant'
          ? DB.liste('classes').map(function (c) { return [c.id, c.nom]; })
          : DB.liste('eleves').map(function (e) { return [e.id, e.prenoms + ' ' + e.nom]; });
        if (!items.length) {
          zone.appendChild(h('p', { class: 'muted' }, r === 'enseignant' ? 'Créez d’abord des classes.' : 'Inscrivez d’abord des élèves.'));
        }
        items.forEach(function (it) {
          var c = h('input', { type: 'checkbox' });
          cases.push({ id: it[0], el: c });
          zone.appendChild(h('label', { class: 'case' }, [c, ' ' + it[1]]));
        });
      } else if (r === 'eleve') {
        choixEleve = h('select', { class: 'champ' }, [h('option', { value: '' }, 'Choisir l’élève…')]
          .concat(DB.liste('eleves').map(function (e) { return h('option', { value: e.id }, e.prenoms + ' ' + e.nom); })));
        zone.appendChild(h('div', { class: 'groupe' }, [h('label', {}, 'Élève concerné'), choixEleve]));
      }
    }
    role.addEventListener('change', dessinerZone);
    dessinerZone();

    function enregistrer() {
      var id = ident.value.trim();
      if (!nom.value.trim() || !id || !mdp.value) { UI.toast('Renseignez le nom, l’identifiant et le mot de passe'); return; }
      if (mdp.value.length < 4) { UI.toast('Mot de passe trop court (4 caractères minimum)'); return; }
      var existe = DB.liste('comptes').some(function (c) { return c.identifiant.toLowerCase() === id.toLowerCase(); });
      if (existe) { UI.toast('Cet identifiant existe déjà'); return; }
      var rec = { nom: nom.value.trim(), identifiant: id, mdp: mdp.value, role: role.value, classeIds: [], eleveIds: [], eleveId: '' };
      var cochees = cases.filter(function (c) { return c.el.checked; }).map(function (c) { return c.id; });
      if (role.value === 'enseignant') rec.classeIds = cochees;
      if (role.value === 'parent') rec.eleveIds = cochees;
      if (role.value === 'eleve') {
        if (!choixEleve.value) { UI.toast('Choisissez l’élève concerné'); return; }
        rec.eleveId = choixEleve.value;
      }
      DB.ajouter('comptes', rec);
      UI.toast('Compte créé');
      rafraichir();
    }

    return h('div', { class: 'panneau' }, [
      h('h3', {}, 'Nouveau compte'),
      h('div', { class: 'formulaire' }, [
        h('div', { class: 'groupe' }, [h('label', {}, 'Nom complet'), nom]),
        h('div', { class: 'groupe' }, [h('label', {}, 'Identifiant'), ident]),
        h('div', { class: 'groupe' }, [h('label', {}, 'Mot de passe'), mdp]),
        h('div', { class: 'groupe' }, [h('label', {}, 'Espace'), role])
      ]),
      zone,
      h('button', { class: 'btn', onclick: enregistrer }, 'Créer le compte')
    ]);
  }

  EP.vues.parametres = function (vue) {
    vue.appendChild(h('p', { class: 'muted', style: 'margin-bottom:14px' },
      'Utilisateurs et espaces. Version de test : les mots de passe sont gardés tels quels sur cet appareil. Changez celui de la direction (admin / 1234).'));
    vue.appendChild(h('div', { class: 'tableau' }, [tableComptes()]));
    vue.appendChild(formCompte());
  };
})();
