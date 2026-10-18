/**
 * ANU (Absolutely Nothing University) · Firebase Google Authentication & Cloud Sync Client
 *
 * Security & Architecture Compliance:
 * 1. Integrates official Firebase Authentication Web SDK (v11 modular ESM).
 * 2. Enables ONLY Google Sign-In (GoogleAuthProvider) — zero password auth.
 * 3. Uses Firebase SDK credential management (browserLocalPersistence + indexedDBLocalPersistence)
 *    and NEVER stores raw ID tokens or refresh tokens manually in localStorage.
 * 4. Handles iPhone Safari & mobile browsers (popup-blocked fallback to signInWithRedirect,
 *    plus ITP cross-site storage guidance with custom authDomain freeze.edu.kg).
 * 5. Communicates with https://api.freeze.edu.kg with verified Bearer ID tokens,
 *    Cloudflare Turnstile tokens on write actions, and X-Idempotency-Key for local archive imports.
 * 6. Guests can continue using 100% of all satirical campus features without signing in.
 */
(function (global) {
  "use strict";

  const DEFAULT_CONFIG = {
    apiBaseUrl: "https://api.freeze.edu.kg",
    turnstileSiteKey: "0x4AAAAAAADnPIDROrmt1Wwj", // Replace with production Turnstile Site Key in js/anu-config.js or window.ANU_CONFIG
    firebase: {
      // Production Firebase Web App config for freeze.edu.kg
      // Replace placeholder keys with your Firebase Console values (see README.md)
      apiKey: "",
      authDomain: "freeze.edu.kg",
      projectId: "anu-freeze-edu",
      appId: ""
    }
  };

  function getRuntimeConfig() {
    const custom = global.ANU_CONFIG || {};
    return {
      apiBaseUrl: (custom.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl).replace(/\/+$/, ""),
      turnstileSiteKey: custom.turnstileSiteKey || DEFAULT_CONFIG.turnstileSiteKey,
      firebase: Object.assign({}, DEFAULT_CONFIG.firebase, custom.firebase || {})
    };
  }

  function isMobileSafariOrEmbedded() {
    const ua = (navigator.userAgent || "").toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    const isInApp = /micromessenger|weibo|qq\/|instagram|fbav|line\//.test(ua);
    return { isIOS, isSafari, isInApp };
  }

  // Deterministic SVG University Crest Avatar Generator (Zero external network leak)
  const AVATAR_PALETTES = {
    "crest-oxford": { bg: "#0B2E59", ring: "#93C5FD", accent: "#2563EB", text: "#FFFFFF", icon: "🎓" },
    "crest-ginger": { bg: "#7C2D12", ring: "#FDBA74", accent: "#EA580C", text: "#FFF7ED", icon: "🐾" },
    "crest-void": { bg: "#1E293B", ring: "#CBD5E1", accent: "#64748B", text: "#F8FAFC", icon: "∅" },
    "crest-slumber": { bg: "#1E1B4B", ring: "#A5B4FC", accent: "#4F46E5", text: "#EEF2FF", icon: "🌙" },
    "crest-thermos": { bg: "#14532D", ring: "#86EFAC", accent: "#16A34A", text: "#F0FDF4", icon: "🍵" },
    "crest-retreat": { bg: "#3B0764", ring: "#D8B4FE", accent: "#9333EA", text: "#FAF5FF", icon: "🥁" }
  };

  function renderCrestAvatarSvg(containerEl, avatarSeed, nickname, avatarUrl) {
    if (!containerEl) return;
    containerEl.textContent = "";

    if (avatarUrl && /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com\//i.test(avatarUrl)) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = nickname || "ANU Student Avatar";
      img.referrerPolicy = "no-referrer";
      img.className = "my-anu-avatar-img";
      img.addEventListener("error", () => {
        renderCrestAvatarSvg(containerEl, avatarSeed, nickname, "");
      });
      containerEl.appendChild(img);
      return;
    }

    const palette = AVATAR_PALETTES[avatarSeed] || AVATAR_PALETTES["crest-oxford"];
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 96 96");
    svg.setAttribute("class", "my-anu-avatar-svg");
    svg.setAttribute("aria-hidden", "true");

    const circleBg = document.createElementNS(svgNS, "circle");
    circleBg.setAttribute("cx", "48");
    circleBg.setAttribute("cy", "48");
    circleBg.setAttribute("r", "45");
    circleBg.setAttribute("fill", palette.bg);
    circleBg.setAttribute("stroke", palette.ring);
    circleBg.setAttribute("stroke-width", "3");

    const innerRing = document.createElementNS(svgNS, "circle");
    innerRing.setAttribute("cx", "48");
    innerRing.setAttribute("cy", "48");
    innerRing.setAttribute("r", "37");
    innerRing.setAttribute("fill", "none");
    innerRing.setAttribute("stroke", palette.accent);
    innerRing.setAttribute("stroke-width", "1.5");
    innerRing.setAttribute("stroke-dasharray", "4 3");

    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("x", "48");
    textEl.setAttribute("y", "56");
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("fill", palette.text);
    textEl.setAttribute("font-size", "28");
    textEl.setAttribute("font-weight", "700");
    textEl.textContent = palette.icon;

    svg.appendChild(circleBg);
    svg.appendChild(innerRing);
    svg.appendChild(textEl);
    containerEl.appendChild(svg);
  }

  // State managed purely in memory (Firebase SDK manages its own IndexedDB auth state)
  let firebaseApp = null;
  let firebaseAuth = null;
  let firebaseModules = null;
  let currentUser = null; // Firebase User object
  let studentBundle = null; // Server-returned { profile, transcripts, papers, diplomas, honors }
  let isRegistered = false;
  let authReady = false;
  let turnstileWidgetId = null;
  let latestTurnstileToken = "";
  const stateListeners = [];

  function notifyListeners() {
    const snapshot = {
      authReady,
      isConfigured: isFirebaseConfigured(),
      user: currentUser
        ? {
            displayName: currentUser.displayName || "",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || ""
          }
        : null,
      isRegistered,
      bundle: studentBundle
    };
    stateListeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (_) {}
    });
  }

  function isFirebaseConfigured() {
    const cfg = getRuntimeConfig().firebase;
    return Boolean(cfg && cfg.apiKey && cfg.apiKey.length > 10 && cfg.projectId);
  }

  async function loadFirebaseSdk() {
    if (firebaseModules) return firebaseModules;
    const [appMod, authMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js")
    ]);
    firebaseModules = { appMod, authMod };
    return firebaseModules;
  }

  async function initAuth() {
    if (!isFirebaseConfigured()) {
      authReady = true;
      notifyListeners();
      return;
    }

    try {
      const { appMod, authMod } = await loadFirebaseSdk();
      const cfg = getRuntimeConfig().firebase;
      firebaseApp = appMod.initializeApp(cfg);
      firebaseAuth = authMod.getAuth(firebaseApp);

      // Prefer IndexedDB + browserLocalPersistence managed by Firebase SDK (never custom localStorage token storage)
      try {
        await authMod.setPersistence(firebaseAuth, authMod.indexedDBLocalPersistence);
      } catch {
        await authMod.setPersistence(firebaseAuth, authMod.browserLocalPersistence);
      }

      // Handle redirect result on iPhone Safari / Mobile after signInWithRedirect
      try {
        await authMod.getRedirectResult(firebaseAuth);
      } catch (_) {
        // Handled via onAuthStateChanged or UI feedback
      }

      authMod.onAuthStateChanged(firebaseAuth, async (user) => {
        currentUser = user || null;
        authReady = true;
        if (currentUser) {
          await refreshStudentBundle();
        } else {
          studentBundle = null;
          isRegistered = false;
          notifyListeners();
        }
      });
    } catch {
      authReady = true;
      notifyListeners();
    }
  }

  async function getFreshIdToken(forceRefresh = false) {
    if (!currentUser || typeof currentUser.getIdToken !== "function") {
      throw new Error("NOT_AUTHENTICATED");
    }
    return currentUser.getIdToken(forceRefresh);
  }

  async function apiRequest(path, options = {}) {
    const cfg = getRuntimeConfig();
    const url = `${cfg.apiBaseUrl}${path}`;
    const headers = Object.assign(
      {
        "Content-Type": "application/json"
      },
      options.headers || {}
    );

    if (options.requireAuth !== false) {
      const idToken = await getFreshIdToken(false);
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    if (options.turnstileToken) {
      headers["X-Turnstile-Token"] = options.turnstileToken;
    } else if (latestTurnstileToken) {
      headers["X-Turnstile-Token"] = latestTurnstileToken;
    }

    if (options.idempotencyKey) {
      headers["X-Idempotency-Key"] = options.idempotencyKey;
    }

    const resp = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "omit"
    });

    let payload = null;
    try {
      payload = await resp.json();
    } catch {
      payload = { ok: false, error: { code: "NETWORK_PARSE_ERROR", message: "Invalid server response." } };
    }

    if (!resp.ok || !payload || payload.ok === false) {
      const errCode = (payload && payload.error && payload.error.code) || `HTTP_${resp.status}`;
      const errMsg = (payload && payload.error && payload.error.message) || "Request failed.";
      const err = new Error(errMsg);
      err.code = errCode;
      err.status = resp.status;
      throw err;
    }

    return payload;
  }

  async function refreshStudentBundle() {
    if (!currentUser) {
      studentBundle = null;
      isRegistered = false;
      notifyListeners();
      return null;
    }
    try {
      const res = await apiRequest("/api/v1/me", { method: "GET" });
      isRegistered = Boolean(res.registered && res.data);
      studentBundle = res.data || null;
      notifyListeners();
      return studentBundle;
    } catch {
      notifyListeners();
      return null;
    }
  }

  /**
   * Signs in with Google following Firebase official best practices for both desktop
   * and iPhone Safari / mobile browsers:
   * - Attempts signInWithPopup first on user gesture (works on iOS 16.4+ Safari and desktop).
   * - Automatically falls back to signInWithRedirect if popup is blocked (`auth/popup-blocked`,
   *   `auth/cancelled-popup-request`, or embedded webviews).
   */
  async function signInWithGoogle() {
    if (!isFirebaseConfigured()) {
      const err = new Error("FIREBASE_NOT_CONFIGURED");
      err.code = "FIREBASE_NOT_CONFIGURED";
      throw err;
    }

    const { authMod } = await loadFirebaseSdk();
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const envInfo = isMobileSafariOrEmbedded();
    try {
      const result = await authMod.signInWithPopup(firebaseAuth, provider);
      currentUser = result.user;
      await refreshStudentBundle();
      return { mode: "popup", user: currentUser };
    } catch (err) {
      const code = (err && err.code) || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        (envInfo.isIOS && code === "auth/popup-closed-by-user" && envInfo.isInApp)
      ) {
        await authMod.signInWithRedirect(firebaseAuth, provider);
        return { mode: "redirect", user: null };
      }
      throw err;
    }
  }

  async function signOutStudent() {
    if (firebaseAuth && firebaseModules) {
      await firebaseModules.authMod.signOut(firebaseAuth);
    }
    currentUser = null;
    studentBundle = null;
    isRegistered = false;
    notifyListeners();
  }

  async function registerStudentProfile(formPayload, turnstileToken) {
    const res = await apiRequest("/api/v1/me/register", {
      method: "POST",
      turnstileToken,
      body: {
        nickname: formPayload.nickname,
        college: formPayload.college,
        majorIdx: formPayload.majorIdx,
        major: formPayload.major,
        honorIdx: formPayload.honorIdx,
        fictionalHonor: formPayload.fictionalHonor,
        enrollmentYear: formPayload.enrollmentYear || 2026,
        avatarSeed: formPayload.avatarSeed || "crest-oxford",
        useGoogleAvatar: Boolean(formPayload.useGoogleAvatar),
        visibility: formPayload.visibility === "public" ? "public" : "private",
        publicConsent: Boolean(formPayload.publicConsent),
        acceptTerms: Boolean(formPayload.acceptTerms),
        acceptPrivacy: Boolean(formPayload.acceptPrivacy),
        turnstileToken
      }
    });
    isRegistered = true;
    studentBundle = res.data;
    notifyListeners();
    return res.data;
  }

  async function updateStudentProfile(patchPayload) {
    const res = await apiRequest("/api/v1/me/profile", {
      method: "PATCH",
      body: patchPayload
    });
    studentBundle = res.data;
    notifyListeners();
    return res.data;
  }

  async function submitExamToCloud(courseCode, answers) {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/exams", {
      method: "POST",
      body: { courseCode, answers }
    });
    studentBundle = res.data;
    notifyListeners();
    return res;
  }

  async function submitPaperToCloud(paperPayload, turnstileToken) {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/papers", {
      method: "POST",
      turnstileToken,
      body: {
        title: paperPayload.title,
        author: paperPayload.author,
        journalIdx: paperPayload.journalIdx,
        methodologyIdx: paperPayload.methodologyIdx,
        turnstileToken
      }
    });
    studentBundle = res.data;
    notifyListeners();
    return res;
  }

  async function submitDiplomaToCloud(diplomaPayload, turnstileToken) {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/diplomas", {
      method: "POST",
      turnstileToken,
      body: {
        recipientName: diplomaPayload.recipientName,
        degreeIdx: diplomaPayload.degreeIdx,
        majorIdx: diplomaPayload.majorIdx,
        honorIdx: diplomaPayload.honorIdx,
        citationIdx: diplomaPayload.citationIdx,
        templateId: diplomaPayload.templateId,
        certLang: diplomaPayload.certLang,
        turnstileToken
      }
    });
    studentBundle = res.data;
    notifyListeners();
    return res;
  }

  async function syncHonorOrClubToCloud(badgeKey, action = "add") {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/honors", {
      method: "POST",
      body: { badgeKey, action }
    });
    studentBundle = res.data;
    notifyListeners();
    return res.data;
  }

  async function importLocalArchiveToCloud(localArchivePayload, idempotencyKey) {
    const res = await apiRequest("/api/v1/me/import", {
      method: "POST",
      idempotencyKey,
      body: localArchivePayload
    });
    studentBundle = res.data;
    notifyListeners();
    return res;
  }

  async function deleteStudentAccount() {
    const res = await apiRequest("/api/v1/me", {
      method: "DELETE",
      body: { confirmDelete: "DELETE_MY_ANU_ARCHIVE" }
    });
    if (currentUser && typeof currentUser.delete === "function") {
      try {
        await currentUser.delete();
      } catch {
        await signOutStudent();
      }
    } else {
      await signOutStudent();
    }
    studentBundle = null;
    isRegistered = false;
    notifyListeners();
    return res;
  }

  async function lookupPublicStudentProfile(studentNumber) {
    return apiRequest(`/api/v1/public/profile/${encodeURIComponent(studentNumber.trim())}`, {
      method: "GET",
      requireAuth: false
    });
  }

  function mountTurnstileWidget(containerSelector) {
    const cfg = getRuntimeConfig();
    if (!cfg.turnstileSiteKey) return;
    const el = document.querySelector(containerSelector);
    if (!el) return;

    const renderWidget = () => {
      if (!global.turnstile) return;
      el.textContent = "";
      turnstileWidgetId = global.turnstile.render(el, {
        sitekey: cfg.turnstileSiteKey,
        theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
        callback: function (token) {
          latestTurnstileToken = token;
        },
        "expired-callback": function () {
          latestTurnstileToken = "";
        }
      });
    };

    if (global.turnstile) {
      renderWidget();
      return;
    }

    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    }
  }

  function getTurnstileToken() {
    if (global.turnstile && turnstileWidgetId !== null) {
      try {
        return global.turnstile.getResponse(turnstileWidgetId) || latestTurnstileToken;
      } catch {
        return latestTurnstileToken;
      }
    }
    return latestTurnstileToken;
  }

  function resetTurnstile() {
    if (global.turnstile && turnstileWidgetId !== null) {
      try {
        global.turnstile.reset(turnstileWidgetId);
      } catch (_) {}
    }
    latestTurnstileToken = "";
  }

  function onStateChange(listener) {
    if (typeof listener === "function") {
      stateListeners.push(listener);
    }
  }

  global.ANU_AUTH = {
    initAuth,
    onStateChange,
    isFirebaseConfigured,
    signInWithGoogle,
    signOutStudent,
    refreshStudentBundle,
    registerStudentProfile,
    updateStudentProfile,
    submitExamToCloud,
    submitPaperToCloud,
    submitDiplomaToCloud,
    syncHonorOrClubToCloud,
    importLocalArchiveToCloud,
    deleteStudentAccount,
    lookupPublicStudentProfile,
    renderCrestAvatarSvg,
    mountTurnstileWidget,
    getTurnstileToken,
    resetTurnstile,
    getState: () => ({
      authReady,
      isConfigured: isFirebaseConfigured(),
      user: currentUser,
      isRegistered,
      bundle: studentBundle
    })
  };
})(window);
