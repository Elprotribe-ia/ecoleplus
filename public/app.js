/* app.js : démarrage. Chargé EN DERNIER. */
(function () {
  var UI = EP.UI;
  var courant = 'accueil';

  // Tableau de bord
  EP.vues.accueil = function (conteneur) {
    var p = EP.DB.param();
    conteneur.appendChild(UI.h('p', { class: 'muted' }, p.ecole + ' · ' + p.ville + ' · Année ' + p.annee));
    conteneur.appendChild(UI.h('div', { class: 'grille', style: 'margin-top:12px' }, [
      UI.carte(EP.DB.compter('eleves'), 'Élèves inscrits'),
      UI.carte(EP.DB.compter('presences'), 'Présences saisies'),
      UI.carte(EP.DB.compter('paiements'), 'Paiements'),
      UI.carte(EP.DB.compter('personnel'), 'Personnel')
    ]));
  };

  function aller(id) {
    var page = EP.NAV.find(function (n) { return n.id === id; }) || EP.NAV[0];
    courant = page.id;
    UI.$('titre').textContent = page.titre;
    var vue = UI.$('vue');
    vue.innerHTML = '';
    if (typeof EP.vues[page.id] === 'function') EP.vues[page.id](vue);
    else vue.appendChild(UI.enConstruction(page.titre));
    construireMenu();
    UI.$('menu').classList.remove('ouvert');
  }

  function construireMenu() {
    var m = UI.$('menu');
    var p = EP.DB.param();
    m.innerHTML = '';
    m.appendChild(UI.h('div', { class: 'menu-logo' }, 'ÉcolePlus'));
    m.appendChild(UI.h('div', { class: 'menu-ecole' }, p.ecole + ' ' + p.ville));
    EP.NAV.forEach(function (n) {
      m.appendChild(UI.h('a', {
        class: n.id === courant ? 'actif' : '',
        onclick: function () { aller(n.id); }
      }, n.titre));
    });
  }

  function ouvrirApp() {
    UI.$('login').classList.add('cache');
    UI.$('app').classList.remove('cache');
    aller(courant);
  }

  function seConnecter() {
    var p = EP.DB.param();
    var id = UI.$('login-id').value.trim();
    var mdp = UI.$('login-mdp').value;
    if (id === p.login && mdp === p.mdp) {
      sessionStorage.setItem('ep_session', '1');
      UI.$('login-err').textContent = '';
      ouvrirApp();
    } else {
      UI.$('login-err').textContent = 'Identifiant ou mot de passe incorrect.';
    }
  }

  function demarrer() {
    var p = EP.DB.param();
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
    if (sessionStorage.getItem('ep_session') === '1') ouvrirApp();
  }

  demarrer();
})();
