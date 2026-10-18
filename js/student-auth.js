/**
 * ANU (Absolutely Nothing University) · Firebase Google Authentication & Cloud Sync Client
 *
 * Security & Architecture Compliance:
 * 1. Integrates official Firebase Authentication Web SDK (v11 modular ESM).
 * 2. Enables ONLY Google Sign-In (GoogleAuthProvider) — zero password auth.
 * 3. Uses Firebase SDK credential management (browserLocalPersistence + indexedDBLocalPersistence)
 *    and NEVER stores raw ID tokens or refresh tokens manually in localStorage.
 * 4. Uses popup sign-in, with redirect fallback only for a same-origin authDomain.
 * 5. Communicates with https://api.freeze.edu.kg with verified Bearer ID tokens,
 *    Cloudflare Turnstile tokens on write actions, and X-Idempotency-Key for local archive imports.
 * 6. Guests can continue using 100% of all satirical campus features without signing in.
 */
(function (global) {
  "use strict";

  const DEFAULT_CONFIG = {
    apiBaseUrl: "https://api.freeze.edu.kg",
    turnstileSiteKey: "0x4AAAAAAFZ4BsbUQSBtf-KB",
    firebase: {
      apiKey: "AIzaSyARMbWYMW_ov7_EATLs1TmOw_m-oG7-4ZQ",
      authDomain: "project-8995408b-d1b3-4571-83b.firebaseapp.com",
      projectId: "project-8995408b-d1b3-4571-83b",
      storageBucket: "project-8995408b-d1b3-4571-83b.firebasestorage.app",
      messagingSenderId: "353403995690",
      appId: "1:353403995690:web:21cee5147681825b486553"
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
  let authInitPromise = null;
  let authError = null;
  let bundleLoaded = false;
  let cloudLoading = false;
  let cloudError = null;
  let authSession = 0;
  let bundleRefresh = null;
  let turnstileWidgetId = null;
  let turnstileContainer = null;
  let turnstileTheme = null;
  let turnstileMountPending = false;
  let turnstileGeneration = 0;
  let latestTurnstileToken = "";
  let protectedWritePending = false;
  const consumedTurnstileTokens = new Set();
  const stateListeners = [];

  function errorWithCode(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function errorSnapshot(error) {
    return {
      code: (error && error.code) || "NETWORK_ERROR",
      message: (error && error.message) || "云端请求失败，请稍后重试。",
      status: (error && error.status) || null
    };
  }

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
      bundle: studentBundle,
      bundleLoaded,
      cloudLoading,
      cloudError,
      authError
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

  function adoptUser(user) {
    if ((currentUser && currentUser.uid) !== (user && user.uid) || Boolean(currentUser) !== Boolean(user)) {
      authSession += 1;
      studentBundle = null;
      isRegistered = false;
      bundleLoaded = false;
      cloudLoading = false;
      cloudError = null;
      bundleRefresh = null;
      resetTurnstile();
    }
    currentUser = user || null;
  }

  function initAuth() {
    if (!authInitPromise) authInitPromise = initializeAuth();
    return authInitPromise;
  }

  async function initializeAuth() {
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
      } catch (error) {
        authError = errorSnapshot(error);
      }

      authMod.onAuthStateChanged(firebaseAuth, async (user) => {
        adoptUser(user);
        authReady = true;
        if (currentUser) {
          // Firebase does not consume rejected async observer promises.
          try {
            await refreshStudentBundle();
          } catch (_) {
            // refreshStudentBundle has already published cloudError for the UI.
          }
        } else {
          notifyListeners();
        }
      });
    } catch (error) {
      firebaseAuth = null;
      authError = errorSnapshot(error);
      authReady = true;
      notifyListeners();
    }
  }

  async function getFreshIdToken(forceRefresh = false) {
    if (!currentUser || typeof currentUser.getIdToken !== "function") {
      throw errorWithCode("NOT_AUTHENTICATED", "请先登录 Google 账号。");
    }
    return currentUser.getIdToken(forceRefresh);
  }

  async function apiRequest(path, options = {}) {
    const requestSession = options.requireAuth === false ? null : authSession;
    const assertCurrentSession = () => {
      if (requestSession !== null && requestSession !== authSession) {
        throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
      }
    };
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
      assertCurrentSession();
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    if (options.turnstileToken) {
      headers["X-Turnstile-Token"] = options.turnstileToken;
    }

    if (options.idempotencyKey) {
      headers["X-Idempotency-Key"] = options.idempotencyKey;
    }

    if (options.onSend) options.onSend();
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
    assertCurrentSession();

    if (!resp.ok || !payload || payload.ok !== true) {
      const errCode = (payload && payload.error && payload.error.code) || (resp.ok ? "INVALID_SERVER_RESPONSE" : `HTTP_${resp.status}`);
      const errMsg = (payload && payload.error && payload.error.message) || "Request failed.";
      const err = new Error(errMsg);
      err.code = errCode;
      err.status = resp.status;
      throw err;
    }

    return payload;
  }

  function refreshStudentBundle() {
    if (!currentUser) {
      studentBundle = null;
      isRegistered = false;
      bundleLoaded = false;
      cloudLoading = false;
      cloudError = null;
      notifyListeners();
      return Promise.resolve(null);
    }
    if (bundleRefresh && bundleRefresh.session === authSession) return bundleRefresh.promise;
    const session = authSession;
    const promise = fetchStudentBundle(session);
    bundleRefresh = { session, promise };
    return promise;
  }

  async function fetchStudentBundle(session) {
    cloudLoading = true;
    cloudError = null;
    notifyListeners();
    try {
      const res = await apiRequest("/api/v1/me", { method: "GET" });
      if (typeof res.registered !== "boolean" || (res.registered && (!res.data || typeof res.data !== "object"))) {
        throw errorWithCode("INVALID_SERVER_RESPONSE", "云端档案响应不完整，请稍后重试。");
      }
      if (session !== authSession) return null;
      isRegistered = Boolean(res.registered && res.data);
      studentBundle = res.data || null;
      bundleLoaded = true;
      return studentBundle;
    } catch (error) {
      if (session === authSession) cloudError = errorSnapshot(error);
      throw error;
    } finally {
      if (session === authSession) {
        cloudLoading = false;
        bundleRefresh = null;
        notifyListeners();
      }
    }
  }

  async function protectedWrite(path, body, turnstileToken, options = {}) {
    const token = typeof turnstileToken === "string" ? turnstileToken.trim() : getTurnstileToken();
    if (!token) throw errorWithCode("TURNSTILE_REQUIRED", "请先完成人机验证，再提交云端存档。");
    if (protectedWritePending) throw errorWithCode("CLOUD_WRITE_IN_PROGRESS", "上一笔云端提交尚未完成，请稍候。");
    if (consumedTurnstileTokens.has(token)) throw errorWithCode("TURNSTILE_TOKEN_USED", "人机验证已使用，请重新验证。");
    protectedWritePending = true;
    const session = authSession;
    let sent = false;
    try {
      const response = await apiRequest(path, Object.assign({}, options, {
        method: "POST",
        turnstileToken: token,
        body: Object.assign({}, body, { turnstileToken: token }),
        onSend() {
          if (session !== authSession) throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
          sent = true;
          consumedTurnstileTokens.add(token);
          // Only recent in-memory tokens are relevant; never persist credentials.
          if (consumedTurnstileTokens.size > 32) consumedTurnstileTokens.delete(consumedTurnstileTokens.values().next().value);
        }
      }));
      if (session !== authSession) throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
      return response;
    } finally {
      protectedWritePending = false;
      if (sent) resetTurnstile();
    }
  }

  function acceptBundle(bundle) {
    studentBundle = bundle;
    isRegistered = Boolean(bundle);
    bundleLoaded = true;
    cloudError = null;
    notifyListeners();
  }

  function requireRegisteredStudent() {
    if (!currentUser) throw errorWithCode("NOT_AUTHENTICATED", "请先登录 Google 账号。");
    if (!bundleLoaded) throw errorWithCode("CLOUD_PROFILE_NOT_LOADED", "云端档案尚未加载，请先重试同步。");
    if (!isRegistered) throw errorWithCode("PROFILE_NOT_REGISTERED", "请先建立云端学籍。");
  }

  /**
   * Signs in with Google following Firebase official best practices for both desktop
   * and iPhone Safari / mobile browsers:
   * - Attempts signInWithPopup first on user gesture (works on iOS 16.4+ Safari and desktop).
   * - Redirect fallback requires same-origin auth helpers to avoid third-party storage failures.
   * See https://firebase.google.com/docs/auth/web/redirect-best-practices
   */
  async function signInWithGoogle() {
    if (!isFirebaseConfigured()) {
      const err = new Error("FIREBASE_NOT_CONFIGURED");
      err.code = "FIREBASE_NOT_CONFIGURED";
      throw err;
    }

    await initAuth();
    if (!firebaseAuth || !firebaseModules) {
      const error = errorWithCode((authError && authError.code) || "AUTH_NOT_READY", (authError && authError.message) || "登录服务尚未准备完成，请刷新页面后重试。");
      throw error;
    }
    const { authMod } = firebaseModules;
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const envInfo = isMobileSafariOrEmbedded();
    let result;
    try {
      result = await authMod.signInWithPopup(firebaseAuth, provider);
    } catch (err) {
      const code = (err && err.code) || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        (envInfo.isIOS && code === "auth/popup-closed-by-user" && envInfo.isInApp)
      ) {
        const authOrigin = new URL(`https://${getRuntimeConfig().firebase.authDomain}`).origin;
        if (!global.location || global.location.origin !== authOrigin) {
          throw errorWithCode("AUTH_REDIRECT_UNAVAILABLE", "登录弹窗无法打开。请允许此网站的弹窗，并在 Safari 或 Chrome 中重新登录；当前站点尚未配置同源登录跳转。");
        }
        await authMod.signInWithRedirect(firebaseAuth, provider);
        return { mode: "redirect", user: null };
      }
      throw err;
    }
    adoptUser(result.user);
    authReady = true;
    authError = null;
    // A cloud outage does not undo successful Google authentication; state exposes
    // cloudError and the caller can distinguish this from an unfinished redirect.
    try {
      await refreshStudentBundle();
    } catch (_) {}
    return { mode: "popup", user: currentUser, cloudError };
  }

  async function signOutStudent() {
    if (firebaseAuth && firebaseModules) {
      await firebaseModules.authMod.signOut(firebaseAuth);
    }
    adoptUser(null);
    authError = null;
    resetTurnstile();
    notifyListeners();
  }

  async function registerStudentProfile(formPayload, turnstileToken) {
    const res = await protectedWrite("/api/v1/me/register", {
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
        acceptPrivacy: Boolean(formPayload.acceptPrivacy)
    }, turnstileToken);
    acceptBundle(res.data);
    return res.data;
  }

  async function updateStudentProfile(patchPayload) {
    const res = await apiRequest("/api/v1/me/profile", {
      method: "PATCH",
      body: patchPayload
    });
    acceptBundle(res.data);
    return res.data;
  }

  async function submitExamToCloud(courseCode, answers) {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/exams", {
      method: "POST",
      body: { courseCode, answers }
    });
    acceptBundle(res.data);
    return res;
  }

  async function submitPaperToCloud(paperPayload, turnstileToken) {
    requireRegisteredStudent();
    const res = await protectedWrite("/api/v1/me/papers", {
        title: paperPayload.title,
        author: paperPayload.author,
        journalIdx: paperPayload.journalIdx,
        methodologyIdx: paperPayload.methodologyIdx
    }, turnstileToken);
    acceptBundle(res.data);
    return res;
  }

  async function submitDiplomaToCloud(diplomaPayload, turnstileToken) {
    requireRegisteredStudent();
    const res = await protectedWrite("/api/v1/me/diplomas", {
        recipientName: diplomaPayload.recipientName,
        degreeIdx: diplomaPayload.degreeIdx,
        majorIdx: diplomaPayload.majorIdx,
        honorIdx: diplomaPayload.honorIdx,
        citationIdx: diplomaPayload.citationIdx,
        templateId: diplomaPayload.templateId,
        certLang: diplomaPayload.certLang
    }, turnstileToken);
    acceptBundle(res.data);
    return res;
  }

  async function syncHonorOrClubToCloud(badgeKey, action = "add") {
    if (!currentUser || !isRegistered) return null;
    const res = await apiRequest("/api/v1/me/honors", {
      method: "POST",
      body: { badgeKey, action }
    });
    acceptBundle(res.data);
    return res.data;
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  async function importLocalArchiveToCloud(localArchivePayload, turnstileToken) {
    requireRegisteredStudent();
    // Normalize exactly the JSON content being transferred, then hash every field.
    // Sorting object keys keeps equivalent archives stable without ignoring edits.
    const payload = JSON.parse(JSON.stringify(localArchivePayload));
    const serialized = stableJson(payload);
    if (!global.crypto || !global.crypto.subtle) throw errorWithCode("SECURE_CONTEXT_REQUIRED", "请使用 HTTPS 网站导入本地存档。");
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
    const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    const res = await protectedWrite("/api/v1/me/import", payload, turnstileToken, { idempotencyKey: `anu-import-v1-${hash}` });
    acceptBundle(res.data);
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
    bundleLoaded = false;
    cloudError = null;
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

    const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    if (turnstileContainer === el && turnstileTheme === theme && turnstileWidgetId !== null) return;
    if (turnstileWidgetId !== null && global.turnstile) {
      try {
        global.turnstile.remove(turnstileWidgetId);
      } catch (_) {}
    }
    turnstileWidgetId = null;
    latestTurnstileToken = "";
    turnstileContainer = el;
    turnstileTheme = theme;
    turnstileGeneration += 1;

    const renderWidget = () => {
      turnstileMountPending = false;
      if (!global.turnstile || !turnstileContainer || turnstileWidgetId !== null) return;
      const generation = turnstileGeneration;
      turnstileContainer.textContent = "";
      turnstileWidgetId = global.turnstile.render(turnstileContainer, {
        sitekey: cfg.turnstileSiteKey,
        theme: turnstileTheme,
        callback: function (token) {
          if (generation === turnstileGeneration) latestTurnstileToken = token;
        },
        "expired-callback": function () {
          if (generation === turnstileGeneration) latestTurnstileToken = "";
        },
        "error-callback": function () {
          if (generation === turnstileGeneration) latestTurnstileToken = "";
        }
      });
    };

    if (global.turnstile) {
      renderWidget();
      return;
    }

    if (turnstileMountPending) return;
    turnstileMountPending = true;
    let script = document.getElementById("cf-turnstile-script");
    const retryAfterLoadError = () => {
      turnstileMountPending = false;
      latestTurnstileToken = "";
      // A failed script never emits load again. Remove it so the next mount can
      // create a fresh request after connectivity or content blocking changes.
      script.remove();
    };
    if (!script) {
      script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget, { once: true });
      script.addEventListener("error", retryAfterLoadError, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", renderWidget, { once: true });
      script.addEventListener("error", retryAfterLoadError, { once: true });
    }
  }

  function getTurnstileToken() {
    // The callback is authoritative: querying getResponse after expiry/error can
    // otherwise revive a stale token in a delayed provider state update.
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
      bundle: studentBundle,
      bundleLoaded,
      cloudLoading,
      cloudError,
      authError
    })
  };
})(window);
