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
  let sdkInitialized = false;
  let authInitializing = false;
  let authSigningIn = false;
  let authSigningOut = false;
  let signOutPromise = null;
  let authIntent = 0;
  let signInPromise = null;
  let signedOutByUser = false;
  let authError = null;
  let bundleLoaded = false;
  let cloudLoading = false;
  let cloudError = null;
  let cloudSaving = false;
  let cloudRetryable = false;
  let bundleRevision = 0;
  let pendingMutation = null;
  let authSession = 0;
  let bundleRefresh = null;
  let turnstileWidgetId = null;
  let turnstileContainer = null;
  let turnstileTheme = null;
  let turnstileAction = "";
  let turnstileMountPending = false;
  let turnstileGeneration = 0;
  let latestTurnstileToken = "";
  const activePrivateRequests = new Set();
  const consumedTurnstileTokens = new Set();
  const stateListeners = [];

  const REQUEST_TIMEOUT_MS = 12000;
  const AUTH_POPUP_TIMEOUT_MS = 90000;

  function errorWithCode(code, message, retryable = false) {
    const error = new Error(message || code);
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  function authFailure(error) {
    const code = (error && error.code) || "AUTH_LOGIN_FAILED";
    if (error && typeof error.retryable === "boolean") return error;
    return errorWithCode(code, (error && error.message) || "Google 登录失败，请重试。", [
      "auth/network-request-failed", "auth/popup-blocked", "AUTH_REDIRECT_UNAVAILABLE",
      "AUTH_INIT_TIMEOUT", "AUTH_POPUP_TIMEOUT", "AUTH_NOT_READY"
    ].includes(code));
  }

  function errorSnapshot(error) {
    return {
      code: (error && error.code) || "NETWORK_ERROR",
      message: (error && error.message) || "云端请求失败，请稍后重试。",
      status: (error && error.status) || null,
      retryable: Boolean(error && error.retryable)
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
      authError,
      authInitializing,
      authSigningIn,
      authSigningOut,
      cloudSaving,
      cloudRetryable
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
    const changed = (currentUser && currentUser.uid) !== (user && user.uid) || Boolean(currentUser) !== Boolean(user);
    if (changed) {
      authSession += 1;
      bundleRevision += 1;
      activePrivateRequests.forEach((controller) => controller.abort());
      studentBundle = null;
      isRegistered = false;
      bundleLoaded = false;
      cloudLoading = false;
      cloudError = null;
      cloudRetryable = false;
      cloudSaving = false;
      pendingMutation = null;
      bundleRefresh = null;
      resetTurnstile();
      // Session-bound callbacks from a previous account must never revive a
      // challenge. The next UI render mounts a widget for the current session.
      if (global.turnstile && turnstileWidgetId !== null) {
        try { global.turnstile.remove(turnstileWidgetId); } catch (_) {}
      }
      turnstileWidgetId = null;
      turnstileGeneration += 1;
    }
    currentUser = user || null;
    return changed;
  }

  function initAuth() {
    if (sdkInitialized) return Promise.resolve();
    if (!authInitPromise) authInitPromise = Promise.resolve().then(initializeAuth);
    return authInitPromise;
  }

  function prepareSignIn() {
    return initAuth();
  }

  function withDeadline(promise, code, message, timeout = REQUEST_TIMEOUT_MS) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(errorWithCode(code, message, true)), timeout);
      })
    ]).finally(() => clearTimeout(timer));
  }

  async function initializeAuth() {
    authInitializing = true;
    authError = null;
    notifyListeners();
    if (!isFirebaseConfigured()) {
      authReady = true;
      authInitializing = false;
      notifyListeners();
      return;
    }

    try {
      const { appMod, authMod } = await withDeadline(loadFirebaseSdk(), "AUTH_INIT_TIMEOUT", "登录服务加载超时，请检查网络后重试。");
      const cfg = getRuntimeConfig().firebase;
      firebaseApp = firebaseApp || appMod.initializeApp(cfg);
      firebaseAuth = authMod.getAuth(firebaseApp);

      // Prefer IndexedDB + browserLocalPersistence managed by Firebase SDK (never custom localStorage token storage)
      try {
        await withDeadline(authMod.setPersistence(firebaseAuth, authMod.indexedDBLocalPersistence), "AUTH_INIT_TIMEOUT", "登录服务初始化超时，请重试。");
      } catch {
        await withDeadline(authMod.setPersistence(firebaseAuth, authMod.browserLocalPersistence), "AUTH_INIT_TIMEOUT", "登录服务初始化超时，请重试。");
      }

      // Recover an earlier same-origin redirect. Cross-origin redirect is never a fallback.
      try {
        await withDeadline(authMod.getRedirectResult(firebaseAuth), "AUTH_INIT_TIMEOUT", "登录结果读取超时，请重试登录。");
      } catch (error) {
        authError = errorSnapshot(authFailure(error));
      }

      authMod.onAuthStateChanged(firebaseAuth, async (user) => {
        if (user && signedOutByUser) return;
        const changed = adoptUser(user);
        authReady = true;
        if (currentUser) {
          // The SDK observer may finish after the popup's UI deadline. Accept
          // its authenticated state and retire the stale sign-in error, while
          // the guard above still prevents an explicit sign-out being undone.
          authError = null;
          notifyListeners();
          // Firebase does not consume rejected async observer promises.
          try {
            if (changed || !bundleLoaded) await refreshStudentBundle();
          } catch (_) {
            // refreshStudentBundle has already published cloudError for the UI.
          }
        } else {
          notifyListeners();
        }
      });
      sdkInitialized = true;
    } catch (error) {
      firebaseAuth = null;
      sdkInitialized = false;
      authInitPromise = null;
      authError = errorSnapshot(authFailure(error));
      authReady = true;
      notifyListeners();
    } finally {
      authInitializing = false;
      notifyListeners();
    }
  }

  function assertSession(session) {
    if (session !== authSession || !currentUser) {
      throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
    }
  }

  function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function validateBundle(bundle) {
    if (!isRecord(bundle) || !isRecord(bundle.profile) ||
        typeof bundle.profile.studentNumber !== "string" || !bundle.profile.studentNumber.trim() ||
        typeof bundle.profile.nickname !== "string" ||
        (bundle.profile.revision !== undefined && (!Number.isSafeInteger(bundle.profile.revision) || bundle.profile.revision < 0)) ||
        !["transcripts", "papers", "diplomas", "honors"].every((key) =>
          Array.isArray(bundle[key]) && bundle[key].every(isRecord))) {
      throw errorWithCode("INVALID_SERVER_RESPONSE", "云端档案响应不完整，请重试同步。", true);
    }
    return bundle;
  }

  async function apiRequest(path, options = {}) {
    const authenticated = options.requireAuth !== false;
    const requestSession = authenticated ? authSession : null;
    const requestUser = authenticated ? currentUser : null;
    const method = options.method || "GET";
    if (authenticated && (!requestUser || typeof requestUser.getIdToken !== "function")) {
      throw errorWithCode("NOT_AUTHENTICATED", "请先登录 Google 账号。");
    }
    const controller = new AbortController();
    if (authenticated) activePrivateRequests.add(controller);
    let timedOut = false;
    let timer;
    let onAbort;
    const assertActive = () => {
      if (requestSession !== null) assertSession(requestSession);
      if (timedOut) throw errorWithCode("API_REQUEST_TIMEOUT", "云端请求超时，请检查网络后重试。", true);
    };
    const work = async () => {
      const send = async (forceRefresh) => {
        const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
        if (authenticated) {
          const idToken = await requestUser.getIdToken(forceRefresh);
          assertActive();
          headers.Authorization = `Bearer ${idToken}`;
        }
        if (options.turnstileToken) headers["X-Turnstile-Token"] = options.turnstileToken;
        if (options.idempotencyKey) headers["X-Idempotency-Key"] = options.idempotencyKey;
        assertActive();
        if (options.onSend) options.onSend();
        const resp = await fetch(`${getRuntimeConfig().apiBaseUrl}${path}`, {
          method, headers, body: options.body ? JSON.stringify(options.body) : undefined,
          credentials: "omit", signal: controller.signal
        });
        assertActive();
        let payload;
        try { payload = await resp.json(); }
        catch (_) { throw errorWithCode("INVALID_SERVER_RESPONSE", "云端响应格式错误，请稍后重试。", true); }
        assertActive();
        if (!resp.ok || !isRecord(payload) || payload.ok !== true) {
          const code = (payload && payload.error && payload.error.code) || (resp.ok ? "INVALID_SERVER_RESPONSE" : `HTTP_${resp.status}`);
          const error = errorWithCode(code, (payload && payload.error && payload.error.message) || "云端请求失败。",
            resp.status === 408 || resp.status === 429 || resp.status >= 500 || code === "INVALID_SERVER_RESPONSE");
          error.status = resp.status;
          throw error;
        }
        return payload;
      };
      try { return await send(false); }
      catch (error) {
        assertActive();
        // Retry only a definite authentication rejection, never a timeout,
        // an infrastructure error, or an ambiguous write result.
        if (!authenticated || error.status !== 401 || !/^AUTH_(?!SERVER_)/.test(error.code || "")) throw error;
        if (method === "GET") return send(true);
        await requestUser.getIdToken(true);
        assertActive();
        throw errorWithCode("AUTH_RETRY_REQUIRED", "登录凭证已刷新，请重新验证后再次提交。", true);
      }
    };
    try {
      return await Promise.race([
        work(),
        new Promise((_, reject) => {
          onAbort = () => reject(requestSession !== null && requestSession !== authSession
            ? errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。")
            : errorWithCode("API_REQUEST_TIMEOUT", "云端请求超时，请检查网络后重试。", true));
          controller.signal.addEventListener("abort", onAbort, { once: true });
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(errorWithCode("API_REQUEST_TIMEOUT", "云端请求超时，请检查网络后重试。", true));
          }, REQUEST_TIMEOUT_MS);
        })
      ]);
    } catch (error) {
      assertActive();
      if (!error || !error.code || error.name === "AbortError") {
        throw errorWithCode("NETWORK_ERROR", "无法连接云端，请检查网络后重试。", true);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", onAbort);
      activePrivateRequests.delete(controller);
    }
  }

  function refreshStudentBundle() {
    if (!currentUser) {
      notifyListeners();
      return Promise.resolve(null);
    }
    if (pendingMutation && pendingMutation.session === authSession) {
      return pendingMutation.promise.then(() => studentBundle);
    }
    if (bundleRefresh && bundleRefresh.session === authSession && bundleRefresh.revision === bundleRevision) {
      return bundleRefresh.promise;
    }
    const session = authSession;
    const revision = bundleRevision;
    const promise = fetchStudentBundle(session, revision);
    bundleRefresh = { session, revision, promise };
    return promise;
  }

  async function fetchStudentBundle(session, revision) {
    cloudLoading = true;
    cloudError = null;
    cloudRetryable = false;
    notifyListeners();
    try {
      const res = await apiRequest("/api/v1/me", { method: "GET" });
      if (typeof res.registered !== "boolean" || (!res.registered && res.data !== null)) {
        throw errorWithCode("INVALID_SERVER_RESPONSE", "云端档案响应不完整，请稍后重试。", true);
      }
      const bundle = res.registered ? validateBundle(res.data) : null;
      assertSession(session);
      if (revision !== bundleRevision) return studentBundle;
      isRegistered = res.registered;
      studentBundle = bundle;
      bundleLoaded = true;
      return studentBundle;
    } catch (error) {
      if (session === authSession && revision === bundleRevision) {
        cloudError = errorSnapshot(error);
        cloudRetryable = cloudError.retryable;
      }
      throw error;
    } finally {
      if (session === authSession && revision === bundleRevision) {
        cloudLoading = false;
        bundleRefresh = null;
        notifyListeners();
      }
    }
  }

  async function protectedWrite(path, body, turnstileToken, options = {}) {
    const token = typeof turnstileToken === "string" ? turnstileToken.trim() : getTurnstileToken();
    if (!token) throw errorWithCode("TURNSTILE_REQUIRED", "请先完成人机验证，再提交云端存档。");
    if (consumedTurnstileTokens.has(token)) throw errorWithCode("TURNSTILE_TOKEN_USED", "人机验证已使用，请重新验证。");
    const session = authSession;
    let sent = false;
    try {
      return await apiRequest(path, Object.assign({}, options, {
        method: "POST", turnstileToken: token,
        body: Object.assign({}, body, { turnstileToken: token }),
        onSend() {
          assertSession(session);
          sent = true;
          consumedTurnstileTokens.add(token);
          // Only recent in-memory tokens are relevant; never persist credentials.
          if (consumedTurnstileTokens.size > 32) consumedTurnstileTokens.delete(consumedTurnstileTokens.values().next().value);
        }
      }));
    } finally {
      if (sent && session === authSession) resetTurnstile();
    }
  }

  function runMutation(key, task) {
    if (!currentUser) return Promise.reject(errorWithCode("NOT_AUTHENTICATED", "请先登录 Google 账号。"));
    if (pendingMutation && pendingMutation.session === authSession) {
      if (pendingMutation.key === key) return pendingMutation.promise;
      return Promise.reject(errorWithCode("CLOUD_WRITE_IN_PROGRESS", "上一笔云端提交尚未完成，请稍候。"));
    }
    const session = authSession;
    const revision = ++bundleRevision;
    bundleRefresh = null;
    cloudLoading = false;
    cloudSaving = true;
    cloudError = null;
    cloudRetryable = false;
    const operation = { session, key, promise: null };
    pendingMutation = operation;
    operation.promise = Promise.resolve().then(() => {
      assertSession(session);
      return task(() => assertSession(session));
    }).catch((error) => {
      if (session === authSession && revision === bundleRevision) {
        cloudError = errorSnapshot(error);
        cloudRetryable = cloudError.retryable;
      }
      throw error;
    }).finally(() => {
      if (pendingMutation === operation) {
        pendingMutation = null;
        cloudSaving = false;
        notifyListeners();
      }
    });
    notifyListeners();
    return operation.promise;
  }

  function mutateBundle(key, send, returnResponse = false) {
    return runMutation(key, async (assertActive) => {
      const res = await send(assertActive);
      assertActive();
      studentBundle = validateBundle(res.data);
      isRegistered = true;
      bundleLoaded = true;
      cloudError = null;
      cloudRetryable = false;
      return returnResponse ? res : studentBundle;
    });
  }

  function requireRegisteredStudent() {
    if (!currentUser) throw errorWithCode("NOT_AUTHENTICATED", "请先登录 Google 账号。");
    if (!bundleLoaded) throw errorWithCode("CLOUD_PROFILE_NOT_LOADED", "云端档案尚未加载，请先重试同步。");
    if (!isRegistered) throw errorWithCode("PROFILE_NOT_REGISTERED", "请先建立云端学籍。");
  }

  /**
   * Signs in with Google following Firebase official best practices for both desktop
   * and iPhone Safari / mobile browsers:
   * - Attempts signInWithPopup first on user gesture; real desktop and iOS behavior requires device validation.
   * - Redirect fallback requires same-origin auth helpers to avoid third-party storage failures.
   * See https://firebase.google.com/docs/auth/web/redirect-best-practices
   */
  function signInWithGoogle() {
    if (!isFirebaseConfigured()) return Promise.reject(errorWithCode("FIREBASE_NOT_CONFIGURED", "Google 登录尚未配置。"));
    if (authSigningOut) return Promise.reject(errorWithCode("AUTH_SIGNOUT_IN_PROGRESS", "正在退出上一账号，请稍后再登录。", true));
    if (authSigningIn && signInPromise) return signInPromise;
    signedOutByUser = false;
    const intent = ++authIntent;
    let popupStartSession = null;
    authSigningIn = true;
    authError = null;
    notifyListeners();
    const launch = () => {
      if (intent !== authIntent) throw errorWithCode("AUTH_SESSION_CHANGED", "登录操作已取消，请重新操作。");
      if (!sdkInitialized || !firebaseAuth || !firebaseModules) {
        throw errorWithCode((authError && authError.code) || "AUTH_NOT_READY", (authError && authError.message) || "登录服务尚未准备完成，请重试。", true);
      }
      const { authMod } = firebaseModules;
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      popupStartSession = authSession;
      // Invoke popup synchronously when prewarmed: awaiting even an already
      // resolved init promise loses transient user activation on some browsers.
      return withDeadline(authMod.signInWithPopup(firebaseAuth, provider), "AUTH_POPUP_TIMEOUT", "Google 登录等待超时，请重试。", AUTH_POPUP_TIMEOUT_MS)
        .catch(async (error) => {
          if (intent !== authIntent) throw errorWithCode("AUTH_SESSION_CHANGED", "登录操作已取消，请重新操作。");
          if (!["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error && error.code)) throw error;
          let sameOrigin = false;
          try { sameOrigin = global.location && global.location.origin === new URL(`https://${getRuntimeConfig().firebase.authDomain}`).origin; }
          catch (_) {}
          if (!sameOrigin) throw errorWithCode("AUTH_REDIRECT_UNAVAILABLE", "请允许此网站的登录弹窗，并在 Safari 或 Chrome 中重试。当前站点未配置同源登录跳转。", true);
          await withDeadline(authMod.signInWithRedirect(firebaseAuth, provider), "AUTH_POPUP_TIMEOUT", "登录跳转超时，请重试。");
          return { redirect: true };
        });
    };
    let started;
    try { started = sdkInitialized ? launch() : initAuth().then(launch); }
    catch (error) { started = Promise.reject(error); }
    signInPromise = Promise.resolve(started).then(async (result) => {
      if (intent !== authIntent) throw errorWithCode("AUTH_SESSION_CHANGED", "登录操作已取消，请重新操作。");
      if (result && result.redirect) return { mode: "redirect", user: null };
      if (!result || !result.user) throw errorWithCode("AUTH_LOGIN_FAILED", "Google 登录未返回账号，请重试。");
      const changed = adoptUser(result.user);
      authReady = true;
      authError = null;
      try { if (changed || !bundleLoaded || cloudError) await refreshStudentBundle(); }
      catch (_) {}
      if (intent !== authIntent) throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
      return { mode: "popup", user: currentUser, cloudError };
    }).catch(async (error) => {
      const normalized = authFailure(error);
      // A newly accepted SDK identity can arrive before the popup Promise
      // settles. A UI deadline must not replace that authenticated state with
      // a stale error. An unchanged account does not prove a switch succeeded.
      if (normalized.code === "AUTH_POPUP_TIMEOUT" && intent === authIntent &&
          !signedOutByUser && currentUser && popupStartSession !== null &&
          authSession !== popupStartSession) {
        const recoverySession = authSession;
        authError = null;
        try { if (cloudLoading || (!bundleLoaded && !cloudError)) await refreshStudentBundle(); }
        catch (_) { /* Cloud failures remain visible through cloudError. */ }
        if (intent !== authIntent || signedOutByUser) {
          throw errorWithCode("AUTH_SESSION_CHANGED", "登录账号已变更，请重新操作。");
        }
        assertSession(recoverySession);
        // Session recovery is not evidence of a fresh Google authentication;
        // protected server operations still enforce the token's auth_time.
        return { mode: "observer", user: currentUser, cloudError };
      }
      if (intent === authIntent) authError = errorSnapshot(normalized);
      throw normalized;
    }).finally(() => {
      if (intent === authIntent) {
        authSigningIn = false;
        signInPromise = null;
        notifyListeners();
      }
    });
    return signInPromise;
  }

  function signOutStudent() {
    if (signOutPromise) return signOutPromise;
    ++authIntent;
    signedOutByUser = true;
    authSigningIn = false;
    authSigningOut = true;
    signInPromise = null;
    // Detach local state immediately, before any SDK/network await can finish.
    adoptUser(null);
    authError = null;
    resetTurnstile();
    signOutPromise = Promise.resolve().then(() => {
      if (firebaseAuth && firebaseModules) {
        return withDeadline(firebaseModules.authMod.signOut(firebaseAuth), "AUTH_SIGNOUT_TIMEOUT", "云端退出超时，请重试退出。");
      }
    }).catch((error) => {
      authError = errorSnapshot(authFailure(error));
      throw error;
    }).finally(() => {
      authSigningOut = false;
      signOutPromise = null;
      notifyListeners();
    });
    notifyListeners();
    return signOutPromise;
  }

  async function registerStudentProfile(formPayload, turnstileToken) {
    return mutateBundle("register", () => protectedWrite("/api/v1/me/register", {
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
    }, turnstileToken));
  }

  async function updateStudentProfile(patchPayload) {
    requireRegisteredStudent();
    const body = Object.assign({}, patchPayload);
    const revision = studentBundle && studentBundle.profile.revision;
    // Older deployed APIs omit revision; new APIs reject a stale tab's snapshot.
    if (Number.isSafeInteger(revision) && revision >= 0) body.expectedRevision = revision;
    return mutateBundle(`profile:${stableJson(body)}`, () => apiRequest("/api/v1/me/profile", {
      method: "PATCH", body
    }));
  }

  async function submitExamToCloud(courseCode, answers) {
    if (!currentUser || !isRegistered) return null;
    return mutateBundle(`exam:${stableJson({ courseCode, answers })}`, () => apiRequest("/api/v1/me/exams", {
      method: "POST", body: { courseCode, answers }
    }), true);
  }

  async function submitPaperToCloud(paperPayload, turnstileToken) {
    requireRegisteredStudent();
    return mutateBundle(`paper:${stableJson(paperPayload)}`, () => protectedWrite("/api/v1/me/papers", {
        title: paperPayload.title,
        author: paperPayload.author,
        journalIdx: paperPayload.journalIdx,
        methodologyIdx: paperPayload.methodologyIdx
    }, turnstileToken), true);
  }

  async function submitDiplomaToCloud(diplomaPayload, turnstileToken) {
    requireRegisteredStudent();
    return mutateBundle(`diploma:${stableJson(diplomaPayload)}`, () => protectedWrite("/api/v1/me/diplomas", {
        recipientName: diplomaPayload.recipientName,
        degreeIdx: diplomaPayload.degreeIdx,
        majorIdx: diplomaPayload.majorIdx,
        honorIdx: diplomaPayload.honorIdx,
        citationIdx: diplomaPayload.citationIdx,
        templateId: diplomaPayload.templateId,
        certLang: diplomaPayload.certLang
    }, turnstileToken), true);
  }

  async function syncHonorOrClubToCloud(badgeKey, action = "add") {
    if (!currentUser || !isRegistered) return null;
    return mutateBundle(`honor:${stableJson({ badgeKey, action })}`, () => apiRequest("/api/v1/me/honors", {
      method: "POST", body: { badgeKey, action }
    }));
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
    const payload = JSON.parse(JSON.stringify(localArchivePayload));
    const serialized = stableJson(payload);
    return mutateBundle(`import:${serialized}`, async (assertActive) => {
      if (!global.crypto || !global.crypto.subtle) throw errorWithCode("SECURE_CONTEXT_REQUIRED", "请使用 HTTPS 网站导入本地存档。");
      const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
      assertActive();
      const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
      return protectedWrite("/api/v1/me/import", payload, turnstileToken, { idempotencyKey: `anu-import-v1-${hash}` });
    }, true);
  }

  async function exportStudentArchive() {
    requireRegisteredStudent();
    const session = authSession;
    const res = await apiRequest("/api/v1/me/export", { method: "GET" });
    assertSession(session);
    validateBundle(res.data);
    return res;
  }

  async function deleteStudentAccount() {
    requireRegisteredStudent();
    return runMutation("delete", async (assertActive) => {
      const res = await apiRequest("/api/v1/me", {
        method: "DELETE", body: { confirmDelete: "DELETE_MY_ANU_ARCHIVE" }
      });
      assertActive();
      if (res.deleted !== true) throw errorWithCode("INVALID_SERVER_RESPONSE", "云端未确认档案删除，请重试同步确认。", true);
      // This endpoint deletes the ANU archive. The Google account and Firebase
      // identity remain intact; a new profile still requires normal registration.
      studentBundle = null;
      isRegistered = false;
      bundleLoaded = true;
      cloudError = null;
      cloudRetryable = false;
      resetTurnstile();
      return res;
    });
  }

  async function lookupPublicStudentProfile(studentNumber) {
    return apiRequest(`/api/v1/public/profile/${encodeURIComponent(studentNumber.trim())}`, {
      method: "GET",
      requireAuth: false
    });
  }

  function mountTurnstileWidget(containerSelector, action) {
    if (!["register", "paper", "diploma", "import"].includes(action)) {
      resetTurnstile();
      return;
    }
    const cfg = getRuntimeConfig();
    if (!cfg.turnstileSiteKey) return;
    const el = document.querySelector(containerSelector);
    if (!el) return;

    const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    if (turnstileContainer === el && turnstileTheme === theme && turnstileAction === action && turnstileWidgetId !== null) return;
    if (turnstileWidgetId !== null && global.turnstile) {
      try {
        global.turnstile.remove(turnstileWidgetId);
      } catch (_) {}
    }
    turnstileWidgetId = null;
    latestTurnstileToken = "";
    turnstileContainer = el;
    turnstileTheme = theme;
    turnstileAction = action;
    turnstileGeneration += 1;

    const renderWidget = () => {
      turnstileMountPending = false;
      if (!global.turnstile || !turnstileContainer || turnstileWidgetId !== null) return;
      const generation = turnstileGeneration;
      turnstileContainer.textContent = "";
      turnstileWidgetId = global.turnstile.render(turnstileContainer, {
        sitekey: cfg.turnstileSiteKey,
        theme: turnstileTheme,
        action: turnstileAction,
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
    prepareSignIn,
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
    exportStudentArchive,
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
      authError,
      authInitializing,
      authSigningIn,
      authSigningOut,
      cloudSaving,
      cloudRetryable
    })
  };
})(window);
