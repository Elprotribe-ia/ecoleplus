/* data.js : données et stockage. Chargé EN PREMIER. */
window.EP = { vues: {}, UI: {} };

EP.NAV = [
  { id: 'accueil',       titre: 'Tableau de bord' },
  { id: 'eleves',        titre: 'Élèves' },
  { id: 'presences',     titre: 'Présences' },
  { id: 'classes',       titre: 'Classes' },
  { id: 'notes',         titre: 'Notes' },
  { id: 'finances',      titre: 'Finances' },
  { id: 'communication', titre: 'Communication' },
  { id: 'rapports',      titre: 'Rapports' },
  { id: 'parametres',    titre: 'Paramètres' }
];

EP.COLLECTIONS = ['eleves', 'classes', 'presences', 'notes', 'paiements', 'personnel', 'messages'];

EP.DB = (function () {
  var CLE = 'ecoleplus_v1';
  var etat = null;

  function vide() {
    var o = {
      parametres: { ecole: 'Lycée de la Paix', ville: 'Brazzaville', annee: '2026-2027', login: 'admin', mdp: '1234' }
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
  }

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); }
    catch (e) { console.error('Sauvegarde impossible', e); }
  }

  function nouvelId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id' + Date.now() + Math.random().toString(16).slice(2);
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
