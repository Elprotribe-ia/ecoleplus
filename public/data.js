/* data.js : données, rôles et stockage. Chargé EN PREMIER. */
window.EP = { vues: {}, UI: {}, accueils: {} };

EP.ROLES = { direction: 'Direction', enseignant: 'Enseignant', parent: 'Parent', eleve: 'Élève' };

EP.PAGES = {
  accueil: 'Tableau de bord',
  eleves: 'Élèves',
  presences: 'Présences',
  classes: 'Classes',
  notes: 'Notes',
  finances: 'Finances',
  communication: 'Communication',
  rapports: 'Rapports',
  parametres: 'Paramètres'
};

/* Pages visibles dans le menu de chaque espace */
EP.MENUS = {
  direction:  ['accueil', 'eleves', 'presences', 'classes', 'notes', 'finances', 'communication', 'rapports', 'parametres'],
  enseignant: ['accueil', 'presences', 'notes', 'communication'],
  parent:     ['accueil', 'presences', 'notes', 'finances', 'communication'],
  eleve:      ['accueil', 'presences', 'notes', 'communication']
};

EP.COLLECTIONS = ['eleves', 'classes', 'presences', 'notes', 'paiements', 'personnel', 'messages', 'comptes'];

EP.DB = (function () {
  var CLE = 'ecoleplus_v1';
  var etat = null;

  function nouvelId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id' + Date.now() + Math.random().toString(16).slice(2);
  }

  function compteDirection() {
    var now = new Date().toISOString();
    return {
      id: nouvelId(), nom: 'Direction', identifiant: 'admin', mdp: '1234', role: 'direction',
      classeIds: [], eleveIds: [], eleveId: '', creeLe: now, modifieLe: now, sync: false
    };
  }

  function vide() {
    var o = {
      parametres: { ecole: 'Lycée de la Paix', ville: 'Brazzaville', annee: '2026-2027' }
    };
    EP.COLLECTIONS.forEach(function (c) { o[c] = []; });
    return o;
  }

  function charger() {
    try { etat = JSON.parse(localStorage.getItem(CLE)) || vide(); }
    catch (e) { etat = vide(); }
    var base = vide();
    if (!etat.parametres) etat.parametres = base.parametres;
    EP.COLLECTIONS.forEach(function (c) { if (!Array.isArray(etat[c])) etat[c] = []; });
    if (!etat.comptes.length) { etat.comptes.push(compteDirection()); sauver(); }
  }

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); }
    catch (e) { console.error('Sauvegarde impossible', e); }
  }

  var api = {
    liste: function (c) { return etat[c].slice(); },
    compter: function (c) { return etat[c].length; },
    trouver: function (c, id) { return etat[c].find(function (x) { return x.id === id; }) || null; },
    ajouter: function (c, obj) {
      var now = new Date().toISOString();
      var rec = Object.assign({}, obj, { id: nouvelId(), creeLe: now, modifieLe: now, sync: false });
      etat[c].push(rec); sauver(); return rec;
    },
    modifier: function (c, id, patch) {
      var rec = api.trouver(c, id);
      if (!rec) return null;
      Object.assign(rec, patch, { modifieLe: new Date().toISOString(), sync: false });
      sauver(); return rec;
    },
    supprimer: function (c, id) {
      etat[c] = etat[c].filter(function (x) { return x.id !== id; }); sauver();
    },
    param: function () { return etat.parametres; },
    setParam: function (patch) { Object.assign(etat.parametres, patch); sauver(); }
  };

  charger();
  return api;
})();
