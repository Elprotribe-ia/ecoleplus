/* app.js : démarrage, connexion et espaces. Chargé EN DERNIER. */
(function () {
  var UI = EP.UI, DB = EP.DB, h = UI.h;
  var courant = 'accueil';
  var moi = null;
  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  EP.session = function () { return moi; };

  function nomClasse(id) { var c = DB.trouver('classes', id); return c ? c.nom : '—'; }
  function initiales(n) {
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0].toUpperCase(); }).join('') || 'MA';
  }
  function titrePage(id) {
    return (id === 'accueil' && moi.role !== 'direction') ? 'Mon espace' : EP.PAGES[id];
  }

  /* Cours du jour pour une liste de classes */
  function coursDuJour(classeIds) {
    var auj = JOURS[new Date().getDay()], out = [];
    classeIds.forEach(function (id) {
      var c = DB.trouver('classes', id);
      if (!c) return;
      (c.edt || []).forEach(function (x) { if (x.jour === auj) out.push({ c: c, x: x }); });
    });
    return out.sort(function (a, b) { return a.x.debut < b.x.debut ? -1 : 1; });
  }
  function blocCours(conteneur, classeIds) {
    var l = coursDuJour(classeIds);
    var contenu = [h('h3', {}, 'Aujourd’hui : ' + l.length + ' cours')];
    if (l.length) {
      l.forEach(function (o) {
        contenu.push(h('div', { class: 'ligne' }, [
          h('strong', {}, o.x.debut + ' — ' + o.x.fin + '  ' + o.x.matiere),
          h('span', { class: 'muted' }, o.c.nom)
        ]));
      });
    } else {
      contenu.push(h('p', { class: 'muted' }, 'Aucun cours prévu aujourd’hui.'));
    }
    conteneur.appendChild(h('div', { class: 'panneau' }, contenu));
  }

  /* ---------- Accueil de chaque espace ---------- */
  EP.accueils.direction = function (v) {
    var p = DB.param();
    v.appendChild(h('p', { class: 'muted' }, p.ecole + ' · ' + p.ville + ' · Année ' + p.annee));
    v.appendChild(h('div', { class: 'grille', style: 'margin-top:12px' }, [
      UI.carte(DB.compter('eleves'), 'Élèves inscrits'),
      UI.carte(DB.compter('presences'), 'Présences saisies'),
      UI.carte(DB.compter('paiements'), 'Paiements'),
      UI.carte(DB.compter('personnel'), 'Personnel')
    ]));
  };

  EP.accueils.enseignant = function (v) {
    var ids = moi.classeIds || [];
    v.appendChild(h('h2', {}, 'Bonjour, ' + moi.nom));
    v.appendChild(h('p', { class: 'muted', style: 'margin-top:6px' },
      ids.length ? 'Vos classes : ' + ids.map(nomClasse).join(', ') : 'Aucune classe ne vous est encore attribuée. Demandez à la direction.'));
    blocCours(v, ids);
  };

  EP.accueils.parent = function (v) {
    var ids = moi.eleveIds || [];
    v.appendChild(h('h2', {}, 'Bonjour, ' + moi.nom));
    if (!ids.length) {
      v.appendChild(h('p', { class: 'muted', style: 'margin-top:6px' }, 'Aucun enfant n’est encore relié à votre compte. Demandez à la direction.'));
      return;
    }
    ids.forEach(function (id) {
      var e = DB.trouver('eleves', id);
      if (!e) return;
      v.appendChild(h('div', { class: 'panneau' }, [
        h('h3', {}, e.prenoms + ' ' + e.nom.toUpperCase()),
        h('p', { class: 'muted' }, e.matricule + ' · ' + nomClasse(e.classeId)),
        h('p', { style: 'margin-top:10px' }, 'Les notes, présences et le solde apparaîtront ici dès que ces modules seront prêts.')
      ]));
    });
  };

  EP.accueils.eleve = function (v) {
    var e = DB.trouver('eleves', moi.eleveId);
    v.appendChild(h('h2', {}, 'Bonjour, ' + (e ? e.prenoms : moi.nom)));
    if (!e) {
      v.appendChild(h('p', { class: 'muted', style: 'margin-top:6px' }, 'Votre fiche élève n’est pas encore reliée à ce compte. Demandez à la direction.'));
      return;
    }
    v.appendChild(h('p', { class: 'muted', style: 'margin-top:6px' }, e.matricule + ' · ' + nomClasse(e.classeId)));
    blocCours(v, [e.classeId]);
  };

  /* ---------- Navigation ---------- */
  function aller(id) {
    var menu = EP.MENUS[moi.role] || ['accueil'];
    if (menu.indexOf(id) < 0) id = 'accueil';
    courant = id;
    var titre = titrePage(id);
    UI.$('titre').textContent = titre;
    var vue = UI.$('vue');
    vue.innerHTML = '';
    if (id === 'accueil') EP.accueils[moi.role](vue);
    else if (typeof EP.vues[id] === 'function') EP.vues[id](vue);
    else vue.appendChild(UI.enConstruction(titre));
    construireMenu();
    UI.$('menu').classList.remove('ouvert');
  }

  function construireMenu() {
    var m = UI.$('menu');
    var p = DB.param();
    m.innerHTML = '';
    m.appendChild(h('div', { class: 'menu-logo' }, [
      h('img', { src: 'logo.svg', alt: '', class: 'logo-img' }),
      'ÉcolePlus'
    ]));
    m.appendChild(h('div', { class: 'menu-ecole' }, [
      p.ecole + ' ' + p.ville, h('br'), 'Espace ' + EP.ROLES[moi.role].toLowerCase()
    ]));
    EP.MENUS[moi.role].forEach(function (id) {
      m.appendChild(h('a', {
        class: id === courant ? 'actif' : '',
        onclick: function () { aller(id); }
      }, titrePage(id)));
    });
  }

  /* ---------- Connexion ---------- */
  function ouvrirApp() {
    UI.$('login').classList.add('cache');
    UI.$('app').classList.remove('cache');
    UI.$('btn-logout').textContent = initiales(moi.nom);
    courant = 'accueil';
    aller('accueil');
  }

  function seConnecter() {
    var id = UI.$('login-id').value.trim().toLowerCase();
    var mdp = UI.$('login-mdp').value;
    var compte = DB.liste('comptes').find(function (c) {
      return c.identifiant.toLowerCase() === id && c.mdp === mdp;
    });
    if (!compte) {
      UI.$('login-err').textContent = 'Identifiant ou mot de passe incorrect.';
      return;
    }
    moi = compte;
    sessionStorage.setItem('ep_session', compte.id);
    UI.$('login-err').textContent = '';
    ouvrirApp();
  }

  function demarrer() {
    var p = DB.param();
    UI.$('login-ecole').textContent = p.ecole + ' — ' + p.ville;
    UI.$('login-btn').onclick = seConnecter;
    UI.$('login-mdp').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') seConnecter();
    });
    UI.$('btn-menu').onclick = function () { UI.$('menu').classList.toggle('ouvert'); };
    UI.$('btn-logout').onclick = function () {
      sessionStorage.removeItem('ep_session');
      location.reload();
    };
    var sid = sessionStorage.getItem('ep_session');
    if (sid) {
      moi = DB.trouver('comptes', sid);
      if (moi) ouvrirApp();
    }
  }

  demarrer();
})();
