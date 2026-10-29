(() => {
  const PROFILE_KEY = "ecoleplus_profile";
  const DATA_KEY = "ecoleplus_data";
  const PENDING_KEY = "ecoleplus_pending_sync";
  const originalSetItem = Storage.prototype.setItem;
  const initialData = {
    students: [], classes: [], timetable: [], attendance: {},
    attendanceRecords: [], notes: [], evaluations: [], payments: [],
    announcements: [], staff: []
  };
  let quiet = false;
  let saveTimer;
  let authGate;

  function read(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function quietWrite(key, value) {
    quiet = true;
    originalSetItem.call(localStorage, key, JSON.stringify(value));
    quiet = false;
  }

  function payloadFromLocal() {
    return {
      school: read(PROFILE_KEY),
      data: { ...initialData, ...(read(DATA_KEY, {}) || {}) }
    };
  }

  function showNotice(message, parent = document.getElementById("view")) {
    if (!parent) return;
    let notice = parent.querySelector(".cloud-sync-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "cloud-sync-notice";
      notice.style.cssText = "margin:12px 0;padding:12px 14px;border-radius:10px;background:#fff2e3;color:#754b1d;font:14px/1.5 Arial,sans-serif";
      parent.prepend(notice);
    }
    notice.textContent = message;
  }

  function setSyncStatus(online) {
    const label = document.querySelector(".bottom b");
    const detail = document.querySelector(".bottom small");
    if (!label || !detail) return;
    label.textContent = online ? "Synchronisé Cloudflare" : "Mode hors ligne";
    detail.textContent = online ? "Sauvegarde en ligne + locale" : "Changements gardés sur cet appareil";
  }

  async function putLocalState() {
    const payload = payloadFromLocal();
    if (!payload.school) return false;
    originalSetItem.call(localStorage, PENDING_KEY, "1");
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        showAuthGate(payload.school);
        return false;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        showNotice(result.error || "La sauvegarde Cloudflare a échoué. Les données restent sur cet appareil.");
        return false;
      }
      originalSetItem.call(localStorage, PENDING_KEY, "0");
      setSyncStatus(true);
      const notice = document.querySelector(".cloud-sync-notice");
      if (notice) notice.remove();
      return true;
    } catch {
      showNotice("Hors ligne : les changements sont gardés sur cet appareil et seront synchronisés à la prochaine connexion.");
      setSyncStatus(false);
      return false;
    }
  }

  function queueSave() {
    if (quiet || !read(PROFILE_KEY)) return;
    originalSetItem.call(localStorage, PENDING_KEY, "1");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => putLocalState(), 500);
  }

  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    if (!quiet && (key === PROFILE_KEY || key === DATA_KEY)) queueSave();
  };

  function formField(name, label, type = "text", required = true) {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:block;margin:12px 0;color:#35534b;font:600 13px Arial,sans-serif";
    wrap.textContent = label;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = required;
    input.autocomplete = type === "password" ? "new-password" : "off";
    input.style.cssText = "display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:11px;border:1px solid #d7e0da;border-radius:8px;font:14px Arial,sans-serif";
    wrap.append(input);
    return wrap;
  }

  function formMessage(form, message, error = true) {
    let box = form.querySelector("[data-cloud-message]");
    if (!box) {
      box = document.createElement("p");
      box.dataset.cloudMessage = "1";
      box.style.cssText = "font:14px/1.45 Arial,sans-serif;margin:10px 0";
      form.append(box);
    }
    box.style.color = error ? "#a33b30" : "#2e6a4c";
    box.textContent = message;
  }

  async function readResponse(response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "La requête a échoué.");
    return result;
  }

  function schoolFromSetup(formData) {
    return {
      name: String(formData.get("name") || "").trim(),
      type: String(formData.get("type") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      academicYear: String(formData.get("academicYear") || "").trim(),
      currency: String(formData.get("currency") || "FCFA").trim(),
      annualFee: Number(formData.get("annualFee")) || 0,
      gradeScale: Number(formData.get("gradeScale")) || 20,
      levels: String(formData.get("levels") || "").split(",").map((value) => value.trim()).filter(Boolean),
      adminName: String(formData.get("adminName") || "").trim(),
      adminRole: String(formData.get("adminRole") || "").trim(),
      adminEmail: String(formData.get("adminEmail") || "").trim(),
      studentIdPrefix: String(formData.get("studentIdPrefix") || "EP").trim() || "EP"
    };
  }

  function addLoginPanel(form) {
    if (document.getElementById("cloudLoginPanel")) return;
    const details = document.createElement("details");
    details.id = "cloudLoginPanel";
    details.style.cssText = "margin-top:18px;padding:16px;border:1px solid #dce5de;border-radius:12px;background:#fff";
    details.innerHTML = "<summary style=\"cursor:pointer;color:#245b43;font-weight:700\">L’établissement a déjà un compte ? Se connecter</summary>";
    const login = document.createElement("form");
    login.id = "cloudLoginForm";
    login.style.cssText = "margin-top:12px";
    login.append(
      formField("schoolName", "Nom exact de l’établissement"),
      formField("email", "Courriel administrateur", "email"),
      formField("password", "Mot de passe", "password")
    );
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "btn primary";
    button.textContent = "Se connecter et charger les données";
    login.append(button);
    details.append(login);
    form.after(details);
  }

  function enhanceSetupForm(form) {
    if (!form.querySelector('[name="cloudPassword"]')) {
      const grid = Array.from(form.querySelectorAll(".form-grid")).at(-1);
      if (grid) {
        const wrap = document.createElement("div");
        wrap.className = "form full";
        wrap.innerHTML = '<label>Mot de passe administrateur * (12 caractères minimum)</label><input class="field" name="cloudPassword" type="password" minlength="12" autocomplete="new-password" required>';
        grid.append(wrap);
      }
    }
    addLoginPanel(form);
  }

  const view = document.getElementById("view");
  if (view) {
    new MutationObserver(() => {
      const form = document.getElementById("setupForm");
      if (form) enhanceSetupForm(form);
    }).observe(view, { childList: true, subtree: true });
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.id === "setupForm") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const formData = new FormData(form);
      const school = schoolFromSetup(formData);
      const password = String(formData.get("cloudPassword") || "");
      if (password.length < 12) {
        formMessage(form, "Le mot de passe doit contenir au moins 12 caractères.");
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const response = await fetch("/api/setup", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ school, password })
        });
        await readResponse(response);
        quietWrite(PROFILE_KEY, school);
        quietWrite(DATA_KEY, initialData);
        originalSetItem.call(localStorage, PENDING_KEY, "0");
        location.reload();
      } catch (error) {
        formMessage(form, error.message || "Impossible de créer le compte. Vérifie ta connexion.");
        if (button) button.disabled = false;
      }
      return;
    }

    if (form.id === "cloudLoginForm") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const values = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        await readResponse(await fetch("/api/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName: String(values.get("schoolName") || "").trim(),
            email: String(values.get("email") || "").trim(),
            password: String(values.get("password") || "")
          })
        }));
        const session = await readResponse(await fetch("/api/session", { credentials: "same-origin" }));
        quietWrite(PROFILE_KEY, session.school);
        quietWrite(DATA_KEY, session.data || initialData);
        originalSetItem.call(localStorage, PENDING_KEY, "0");
        location.reload();
      } catch (error) {
        formMessage(form, error.message || "Connexion impossible.");
        if (button) button.disabled = false;
      }
    }
  }, true);

  function showAuthGate(school) {
    if (authGate || !document.body) return;
    authGate = document.createElement("div");
    authGate.id = "cloudAuthGate";
    authGate.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:rgba(12,35,28,.72);overflow:auto";
    const box = document.createElement("div");
    box.style.cssText = "box-sizing:border-box;width:min(100%,470px);max-height:95vh;overflow:auto;padding:26px;border-radius:18px;background:#fff;font-family:Arial,sans-serif";
    box.innerHTML = '<div style="color:#4b916b;font-size:12px;font-weight:700;letter-spacing:1px">ÉCOLEPLUS · SYNCHRONISATION</div><h2 style="color:#173d34;margin:8px 0">Connexion à Cloudflare</h2><p style="color:#5e7168;line-height:1.5">Connecte-toi pour charger et enregistrer les données de cet établissement dans sa base sécurisée.</p>';
    const login = document.createElement("form");
    login.id = "cloudLoginForm";
    login.append(
      formField("schoolName", "Nom exact de l’établissement"),
      formField("email", "Courriel administrateur", "email"),
      formField("password", "Mot de passe", "password")
    );
    const loginButton = document.createElement("button");
    loginButton.type = "submit";
    loginButton.className = "btn primary";
    loginButton.textContent = "Se connecter";
    login.append(loginButton);

    const register = document.createElement("details");
    register.style.cssText = "margin-top:18px;padding-top:14px;border-top:1px solid #e2e9e4";
    register.innerHTML = "<summary style=\"cursor:pointer;color:#245b43;font-weight:700\">Créer le compte Cloudflare pour cet établissement</summary>";
    const registerForm = document.createElement("form");
    registerForm.id = "cloudExistingSetupForm";
    registerForm.style.cssText = "margin-top:12px";
    registerForm.append(
      formField("password", "Nouveau mot de passe administrateur (12 caractères minimum)", "password"),
      formField("confirmPassword", "Confirmer le mot de passe", "password")
    );
    const registerButton = document.createElement("button");
    registerButton.type = "submit";
    registerButton.className = "btn primary";
    registerButton.textContent = "Créer et synchroniser le compte";
    registerForm.append(registerButton);
    register.append(registerForm);
    box.append(login, register);
    authGate.append(box);
    document.body.append(authGate);
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.id !== "cloudExistingSetupForm") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const values = new FormData(form);
    const password = String(values.get("password") || "");
    const confirm = String(values.get("confirmPassword") || "");
    if (password.length < 12 || password !== confirm) {
      formMessage(form, password !== confirm ? "Les mots de passe ne correspondent pas." : "Choisis un mot de passe d’au moins 12 caractères.");
      return;
    }
    const school = read(PROFILE_KEY);
    if (!school) {
      formMessage(form, "Aucun profil local à convertir. Utilise le formulaire de configuration.");
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      await readResponse(await fetch("/api/setup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school, password })
      }));
      await readResponse(await fetch("/api/state", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromLocal())
      }));
      originalSetItem.call(localStorage, PENDING_KEY, "0");
      authGate.remove();
      authGate = null;
      location.reload();
    } catch (error) {
      formMessage(form, error.message || "Impossible de créer le compte.");
      if (button) button.disabled = false;
    }
  }, true);

  async function bootstrap() {
    const localSchool = read(PROFILE_KEY);
    try {
      const response = await fetch("/api/session", { credentials: "same-origin" });
      if (response.status === 401) {
        if (localSchool) showAuthGate(localSchool);
        return;
      }
      const session = await readResponse(response);
      setSyncStatus(true);
      if (localStorage.getItem(PENDING_KEY) === "1") {
        await putLocalState();
        return;
      }
      const oldSchool = localStorage.getItem(PROFILE_KEY);
      const oldData = localStorage.getItem(DATA_KEY);
      quietWrite(PROFILE_KEY, session.school);
      quietWrite(DATA_KEY, session.data || initialData);
      const changed = oldSchool !== localStorage.getItem(PROFILE_KEY) ||
        oldData !== localStorage.getItem(DATA_KEY);
      if (changed) location.reload();
    } catch {
      if (localSchool) {
        setSyncStatus(false);
        showNotice("Mode hors ligne : les données restent enregistrées sur cet appareil.");
      }
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }
  window.addEventListener("online", () => {
    if (localStorage.getItem(PENDING_KEY) === "1") putLocalState();
  });
  bootstrap();
})();
