/* ui.js : outils d'affichage. Chargé en 2e. */
(function () {
  var UI = EP.UI;

  UI.$ = function (id) {
    var e = document.getElementById(id);
    if (!e) console.warn('Élément introuvable : #' + id);
    return e;
  };

  UI.h = function (tag, attrs, contenu) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    [].concat(contenu == null ? [] : contenu).forEach(function (c) {
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  };

  UI.carte = function (valeur, libelle) {
    return UI.h('div', { class: 'carte' }, [
      UI.h('div', { class: 'val' }, valeur),
      UI.h('div', { class: 'lib' }, libelle)
    ]);
  };

  UI.toast = function (msg) {
    var t = UI.$('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('cache');
    clearTimeout(UI._t);
    UI._t = setTimeout(function () { t.classList.add('cache'); }, 2500);
  };

  UI.enConstruction = function (titre) {
    return UI.h('div', { class: 'panneau' }, [
      UI.h('h3', {}, titre),
      UI.h('p', { class: 'muted' }, 'Module en construction. On le construit après la base.')
    ]);
  };
})();
