import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { webcrypto, createHash } from "node:crypto";

const source = fs.readFileSync(new URL("../js/student-auth.js", import.meta.url), "utf8");
// Replace only network SDK imports in the test copy. Production exposes no SDK
// override, credential bypass, or test-only configuration flag.
const testSource = source
  .replace('import("https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js")', "Promise.resolve(__appSdk)")
  .replace('import("https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js")', "Promise.resolve(__authSdk)");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function bundle(nickname = "学员") {
  return { profile: { studentNumber: "ANU20260001", nickname, revision: 0 }, transcripts: [], papers: [], diplomas: [], honors: [] };
}

function makeHarness({ origin = "https://freeze.edu.kg", sdkGate, scriptLoaded = true, popupError, firebase, userAgent, popupGate, fastTimeouts = false, fastPopupTimeouts = false, persistenceError, signOutGate } = {}) {
  const calls = { fetch: [], popup: [], redirect: [], initialize: [], render: [], reset: [], remove: [] };
  const elements = new Map();
  let theme = "light";
  let observer;
  let nextRequest = () => response({ ok: true, registered: true, data: bundle() });
  const user = { uid: "test-user", displayName: "Test", getIdToken: async () => "sdk-managed-id-token" };
  const sdkAuth = {};
  const scripts = [];
  let attachedScript = null;
  function createScript() {
    const script = {
      listeners: {},
      addEventListener(event, listener) {
        (this.listeners[event] ||= []).push(listener);
      },
      remove() {
        if (attachedScript === script) attachedScript = null;
      }
    };
    scripts.push(script);
    return script;
  }
  if (!scriptLoaded) attachedScript = createScript();
  const turnstile = {
    render(container, options) {
      const id = `widget-${calls.render.length}`;
      calls.render.push({ id, container, options });
      return id;
    },
    reset(id) { calls.reset.push(id); },
    remove(id) { calls.remove.push(id); },
    getResponse() { return "stale-provider-token"; }
  };
  const document = {
    documentElement: { getAttribute() { return theme; } },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, { selector, textContent: "" });
      return elements.get(selector);
    },
    getElementById() { return attachedScript; },
    createElement() { return createScript(); },
    head: { appendChild(script) { attachedScript = script; } }
  };
  const window = {
    location: { origin },
    crypto: webcrypto,
    ...(scriptLoaded ? { turnstile } : {}),
    ...(firebase ? { ANU_CONFIG: { firebase } } : {})
  };
  const context = vm.createContext({
    window,
    document,
    navigator: { userAgent: userAgent || "Mozilla/5.0 Safari", platform: "MacIntel", maxTouchPoints: 0 },
    AbortController,
    setTimeout: fastTimeouts || fastPopupTimeouts
      ? (fn, ms) => setTimeout(fn, fastTimeouts || ms === 90000 ? 10 : ms)
      : setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    fetch: async (url, options) => {
      calls.fetch.push({ url, ...options });
      return nextRequest(url, options);
    },
    __appSdk: {
      initializeApp(config) { calls.initialize.push(config); return {}; }
    },
    __authSdk: {
      getAuth() { return sdkAuth; },
      indexedDBLocalPersistence: {},
      browserLocalPersistence: {},
      async setPersistence() {
        if (persistenceError) throw Object.assign(new Error(persistenceError), { code: persistenceError });
        if (sdkGate) await sdkGate.promise;
      },
      async getRedirectResult() { return null; },
      onAuthStateChanged(auth, callback) { observer = callback; },
      GoogleAuthProvider: class { setCustomParameters() {} },
      async signInWithPopup(auth) {
        calls.popup.push(auth);
        if (popupGate) return popupGate.promise;
        if (popupError) throw Object.assign(new Error(popupError), { code: popupError });
        return { user };
      },
      async signInWithRedirect(auth) { calls.redirect.push(auth); },
      async signOut() { if (signOutGate) await signOutGate.promise; }
    }
  });
  vm.runInContext(testSource, context, { filename: "student-auth.js" });
  return {
    auth: window.ANU_AUTH,
    calls,
    user,
    sdkAuth,
    window,
    setRequest(fn) { nextRequest = fn; },
    setPersistenceError(code) { persistenceError = code; },
    setPopupError(code) { popupError = code; },
    setPopupGate(gate) { popupGate = gate; },
    setTheme(value) { theme = value; },
    async login() {
      await window.ANU_AUTH.initAuth();
      await observer(user);
    },
    emitUser(value) { return observer(value); },
    challenge(token = "fresh-challenge") {
      const widget = calls.render.at(-1);
      assert.ok(widget, "Mount the widget before solving a challenge");
      widget.options.callback(token);
      return widget;
    },
    loadTurnstile() {
      window.turnstile = turnstile;
      for (const listener of attachedScript.listeners.load || []) listener();
    },
    failTurnstileScript() {
      for (const listener of attachedScript.listeners.error || []) listener();
    },
    scripts,
    get script() { return attachedScript; }
  };
}

export async function runStudentAuthTests() {
  {
    const gate = deferred();
    const h = makeHarness({ sdkGate: gate });
    const initialize = h.auth.initAuth();
    const login = h.auth.signInWithGoogle();
    await Promise.resolve();
    assert.equal(h.calls.popup.length, 0, "Popup must wait for Firebase initialization");
    gate.resolve();
    await initialize;
    const result = await login;
    assert.equal(result.mode, "popup");
    assert.equal(h.calls.popup[0], h.sdkAuth, "Popup must never receive null auth");
    assert.equal(h.calls.initialize.length, 1, "Initialization is shared across concurrent callers");
    assert.equal(h.calls.initialize[0].authDomain, "project-8995408b-d1b3-4571-83b.firebaseapp.com", "Keep the existing public Firebase project config");
    const failedGate = deferred();
    const failed = makeHarness({ sdkGate: failedGate });
    const failedLogin = failed.auth.signInWithGoogle();
    failedGate.reject(Object.assign(new Error("Storage is unavailable"), { code: "auth/web-storage-unsupported" }));
    await assert.rejects(failedLogin, { code: "auth/web-storage-unsupported" });
    assert.equal(failed.calls.popup.length, 0, "Initialization errors cannot invoke popup with a partially initialized SDK");
    assert.equal(failed.auth.getState().authError.code, "auth/web-storage-unsupported");
    console.log("✓ [MOCK PASS] Firebase initialization is idempotent and popup waits for a valid Auth instance");
  }

  {
    const h = makeHarness();
    const failure = () => response({ ok: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "Cloud is unavailable" } }, 503);
    h.setRequest(failure);
    await h.login();
    assert.equal(h.auth.getState().authReady, true);
    assert.equal(h.auth.getState().bundleLoaded, false, "Failed first read cannot mean unregistered");
    assert.equal(h.auth.getState().cloudError.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(h.auth.getState().cloudLoading, false);
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "UPSTREAM_UNAVAILABLE" }, "Manual refresh must reject rather than report success");
    h.setRequest(() => response({ ok: true, registered: true, data: bundle("已注册") }));
    await h.auth.refreshStudentBundle();
    h.setRequest(failure);
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "UPSTREAM_UNAVAILABLE" });
    assert.equal(h.auth.getState().bundleLoaded, true);
    assert.equal(h.auth.getState().isRegistered, true);
    assert.equal(h.auth.getState().bundle.profile.nickname, "已注册", "Outages preserve the last successfully read archive");
    const loginResult = await h.auth.signInWithGoogle();
    assert.equal(loginResult.mode, "popup");
    assert.equal(loginResult.cloudError.code, "UPSTREAM_UNAVAILABLE", "Successful auth still exposes a failed cloud read");
    h.setRequest(() => response({ ok: true }));
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "INVALID_SERVER_RESPONSE" });
    assert.equal(h.auth.getState().isRegistered, true, "Incomplete responses cannot erase known registration");
    h.setRequest(() => response({ ok: true, registered: false, data: null }));
    await h.auth.refreshStudentBundle();
    assert.equal(h.auth.getState().bundleLoaded, true);
    assert.equal(h.auth.getState().isRegistered, false, "Only an explicit successful server read establishes non-registration");
    assert.equal(h.auth.getState().cloudError, null);
    console.log("✓ [MOCK PASS] Cloud failures reject manual refresh, remain handled in auth observers, and preserve known profile state");
  }

  {
    const crossOrigin = makeHarness({ popupError: "auth/popup-blocked", origin: "https://example.github.io" });
    await assert.rejects(crossOrigin.auth.signInWithGoogle(), { code: "AUTH_REDIRECT_UNAVAILABLE" });
    assert.equal(crossOrigin.calls.redirect.length, 0, "Cross-origin authDomain cannot silently redirect Safari into a broken flow");
    const sameOrigin = makeHarness({ popupError: "auth/popup-blocked", firebase: { authDomain: "freeze.edu.kg" } });
    const result = await sameOrigin.auth.signInWithGoogle();
    assert.equal(result.mode, "redirect");
    assert.equal(sameOrigin.calls.redirect.length, 1);
    const cancelled = makeHarness({ popupError: "auth/popup-closed-by-user" });
    await assert.rejects(cancelled.auth.signInWithGoogle(), { code: "auth/popup-closed-by-user" });
    assert.equal(cancelled.calls.redirect.length, 0);
    console.log("✓ [MOCK PASS] Redirect fallback requires same-origin authDomain and distinguishes redirect from popup success");
  }

  {
    const h = makeHarness();
    h.auth.mountTurnstileWidget("#registration", "register");
    h.challenge();
    h.auth.mountTurnstileWidget("#registration", "register");
    assert.equal(h.calls.render.length, 1, "Repeated session/page updates must not remount an unchanged widget");
    assert.equal(h.auth.getTurnstileToken(), "fresh-challenge");
    h.setTheme("dark");
    h.auth.mountTurnstileWidget("#registration", "register");
    assert.equal(h.calls.remove.length, 1);
    assert.equal(h.calls.render.at(-1).options.theme, "dark");
    assert.equal(h.auth.getTurnstileToken(), "");
    const old = h.challenge("old-widget-token");
    h.auth.mountTurnstileWidget("#paper", "paper");
    old.options.callback("delayed-old-widget-token");
    assert.equal(h.auth.getTurnstileToken(), "", "Callbacks from removed widgets cannot restore their tokens");
    const active = h.challenge("paper-token");
    active.options["expired-callback"]();
    assert.equal(h.auth.getTurnstileToken(), "", "Expiry must not fall back to stale getResponse data");
    h.challenge("retry-token");
    active.options["error-callback"]();
    assert.equal(h.auth.getTurnstileToken(), "");
    h.challenge("logout-token");
    await h.auth.signOutStudent();
    assert.equal(h.auth.getTurnstileToken(), "");
    const loading = makeHarness({ scriptLoaded: false });
    loading.auth.mountTurnstileWidget("#registration", "register");
    loading.auth.mountTurnstileWidget("#registration", "register");
    loading.auth.mountTurnstileWidget("#paper", "paper");
    assert.equal(loading.script.listeners.load.length, 1, "A loading script has one mount callback");
    loading.loadTurnstile();
    assert.equal(loading.calls.render.length, 1);
    assert.equal(loading.calls.render[0].container.selector, "#paper", "Deferred mount uses the current page's container");
    const retry = makeHarness({ scriptLoaded: false });
    retry.auth.mountTurnstileWidget("#registration", "register");
    const failedScript = retry.script;
    retry.failTurnstileScript();
    assert.equal(retry.script, null, "A failed script is removed so the next mount can retry loading");
    retry.auth.mountTurnstileWidget("#paper", "paper");
    assert.notEqual(retry.script, failedScript);
    assert.equal(retry.scripts.length, 2);
    assert.equal(retry.script.src, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    retry.loadTurnstile();
    assert.equal(retry.calls.render.length, 1);
    assert.equal(retry.calls.render[0].container.selector, "#paper");
    console.log("✓ [MOCK PASS] Turnstile mounts once per container/theme and clears expired, failed, removed, and signed-out challenges");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration", "register");
    const start = h.calls.fetch.length;
    await assert.rejects(h.auth.registerStudentProfile({ nickname: "学员" }), { code: "TURNSTILE_REQUIRED" });
    await assert.rejects(h.auth.submitPaperToCloud({ title: "论文" }), { code: "TURNSTILE_REQUIRED" });
    await assert.rejects(h.auth.submitDiplomaToCloud({ recipientName: "学员" }), { code: "TURNSTILE_REQUIRED" });
    await assert.rejects(h.auth.importLocalArchiveToCloud({ papers: [] }), { code: "TURNSTILE_REQUIRED" });
    assert.equal(h.calls.fetch.length, start, "Missing challenges fail locally for every protected endpoint");
    h.challenge("unused-get-token");
    await h.auth.refreshStudentBundle();
    await h.auth.lookupPublicStudentProfile(" ANU20260001 ");
    await h.auth.updateStudentProfile({ nickname: "更新" });
    await h.auth.submitExamToCloud("COURSE", [0]);
    await h.auth.syncHonorOrClubToCloud("test-badge");
    for (const req of h.calls.fetch.slice(start)) {
      assert.equal(req.headers["X-Turnstile-Token"], undefined, "Unprotected actions cannot implicitly consume a saved token");
    }
    await h.auth.registerStudentProfile({ nickname: "学员" });
    assert.equal(h.calls.fetch.at(-1).headers["X-Turnstile-Token"], "unused-get-token");
    assert.equal(h.auth.getTurnstileToken(), "");
    assert.equal(h.calls.reset.length, 1);
    await assert.rejects(h.auth.registerStudentProfile({ nickname: "学员" }, "unused-get-token"), { code: "TURNSTILE_TOKEN_USED" });
    const requestGate = deferred();
    h.setRequest(() => requestGate.promise);
    h.challenge("pending-token");
    const pending = h.auth.submitPaperToCloud({ title: "论文" });
    await assert.rejects(h.auth.submitDiplomaToCloud({ recipientName: "学员" }), { code: "CLOUD_WRITE_IN_PROGRESS" });
    requestGate.resolve(response({ ok: false, error: { code: "SERVER_ERROR", message: "Try again" } }, 500));
    await assert.rejects(pending, { code: "SERVER_ERROR" });
    assert.equal(h.auth.getTurnstileToken(), "", "Server errors still consume the one-use challenge");
    assert.equal(h.calls.reset.length, 2);
    h.setRequest(() => { throw new Error("Network disconnected"); });
    h.challenge("network-token");
    await assert.rejects(h.auth.submitDiplomaToCloud({ recipientName: "学员" }), { code: "NETWORK_ERROR" });
    assert.equal(h.calls.reset.length, 3, "Failed transmission still resets the challenge");
    console.log("✓ [MOCK PASS] Protected writes require a fresh challenge, reset after every send, and reject concurrent or reused tokens");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration", "register");
    const first = { papers: [{ title: "A", author: "同学" }], transcripts: [{ courseCode: "C1", score: 70 }] };
    const reordered = { transcripts: [{ score: 70, courseCode: "C1" }], papers: [{ author: "同学", title: "A" }] };
    const changed = { ...first, transcripts: [{ courseCode: "C1", score: 80 }] };
    const keys = [];
    for (const [index, payload] of [first, reordered, changed].entries()) {
      h.challenge(`import-${index}`);
      await h.auth.importLocalArchiveToCloud(payload);
      keys.push(h.calls.fetch.at(-1).headers["X-Idempotency-Key"]);
    }
    assert.equal(keys[0], keys[1], "Object key order does not change import identity");
    assert.notEqual(keys[0], keys[2], "Content changes with the same item counts must produce a new import key");
    const expectedHash = createHash("sha256").update('{"papers":[{"author":"同学","title":"A"}],"transcripts":[{"courseCode":"C1","score":70}]}').digest("hex");
    assert.equal(keys[0], `anu-import-v1-${expectedHash}`, "Import identity hashes the entire canonical JSON payload using SHA-256");
    assert.equal(h.calls.reset.length, 3);
    console.log("✓ [MOCK PASS] Import idempotency uses stable full-content SHA-256 keys and one-use challenges");
  }

  {
    const h = makeHarness();
    await h.login();
    const gate = deferred();
    h.setRequest(() => gate.promise);
    const refresh = h.auth.refreshStudentBundle();
    const rejectedRefresh = assert.rejects(refresh, { code: "AUTH_SESSION_CHANGED" });
    await h.auth.signOutStudent();
    gate.resolve(response({ ok: true, registered: true, data: bundle("旧账号") }));
    await rejectedRefresh;
    assert.equal(h.auth.getState().user, null);
    assert.equal(h.auth.getState().bundle, null, "A late response must not restore a signed-out account's archive");
    assert.equal(h.auth.getState().bundleLoaded, false);
    console.log("✓ [MOCK PASS] Late cloud responses cannot restore archives after sign-out");
  }

  {
    const writes = [
      ["profile PATCH", (auth) => auth.updateStudentProfile({ nickname: "旧账号修改" })],
      ["exam POST", (auth) => auth.submitExamToCloud("COURSE", [0])],
      ["honor POST", (auth) => auth.syncHonorOrClubToCloud("test-badge")]
    ];
    for (const [label, invoke] of writes) {
      for (const transition of ["sign-out", "account switch"]) {
        const h = makeHarness();
        await h.login();
        const sent = deferred();
        const gate = deferred();
        h.setRequest((url, options) => {
          if (options.method === "GET") return response({ ok: true, registered: true, data: bundle("新账号") });
          sent.resolve();
          return gate.promise;
        });
        const pending = invoke(h.auth);
        const rejectedPending = assert.rejects(pending, { code: "AUTH_SESSION_CHANGED" }, `${label} must reject a late response following ${transition}`);
        await sent.promise;
        if (transition === "sign-out") {
          await h.auth.signOutStudent();
        } else {
          await h.emitUser({ uid: "second-user", getIdToken: async () => "second-user-token" });
        }
        gate.resolve(response({ ok: true, data: bundle("旧账号迟到响应") }));
        await rejectedPending;
        const state = h.auth.getState();
        assert.equal(state.bundle && state.bundle.profile.nickname, transition === "sign-out" ? null : "新账号", `${label} must preserve the current account after ${transition}`);
        assert.equal(state.user && state.user.uid, transition === "sign-out" ? null : "second-user");
      }
    }
    const h = makeHarness();
    await h.login();
    const tokenGate = deferred();
    h.user.getIdToken = () => tokenGate.promise;
    const requestCount = h.calls.fetch.length;
    const pending = h.auth.updateStudentProfile({ nickname: "旧账号修改" });
    const rejectedPending = assert.rejects(pending, { code: "AUTH_SESSION_CHANGED" });
    await h.emitUser({ uid: "second-user", getIdToken: async () => "second-user-token" });
    tokenGate.resolve("late-first-user-token");
    await rejectedPending;
    assert.equal(h.calls.fetch.length, requestCount + 1, "Only the new user's profile read may be sent after switching during token acquisition");
    assert.ok(h.calls.fetch.slice(requestCount).every((request) => request.method === "GET" && request.headers.Authorization === "Bearer second-user-token"));
    assert.equal(h.auth.getState().user.uid, "second-user");
    console.log("✓ [MOCK PASS] Profile, exam, and honor writes isolate late responses and reject stale ID tokens before sending");
  }

  {
    const h = makeHarness();
    await h.auth.prepareSignIn();
    const pending = h.auth.signInWithGoogle();
    assert.equal(h.calls.popup.length, 1, "A prepared click invokes popup synchronously before yielding user activation");
    await pending;
    const retry = makeHarness({ persistenceError: "auth/web-storage-unsupported" });
    await assert.rejects(retry.auth.signInWithGoogle(), { code: "auth/web-storage-unsupported" });
    assert.equal(retry.auth.getState().authInitializing, false);
    retry.setPersistenceError(null);
    await retry.auth.prepareSignIn();
    await retry.auth.signInWithGoogle();
    assert.equal(retry.calls.initialize.length, 1, "Retry reuses the existing Firebase app instead of creating a second one");
    assert.equal(retry.auth.getState().authError, null);
    const network = makeHarness({ popupError: "auth/network-request-failed" });
    await assert.rejects(network.auth.signInWithGoogle(), { code: "auth/network-request-failed", retryable: true });
    assert.equal(network.auth.getState().authSigningIn, false);
    network.setPopupError(null);
    await network.auth.signInWithGoogle();
    assert.ok(network.auth.getState().user);
    console.log("✓ [MOCK PASS] Prepared popup preserves the click turn; initialization and login failures can be retried");
  }

  {
    // This is UA simulation with mocked Firebase, not a physical iPhone Safari test.
    const safariUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
    const h = makeHarness({ userAgent: safariUA });
    await h.auth.prepareSignIn();
    const pending = h.auth.signInWithGoogle();
    assert.equal(h.calls.popup.length, 1);
    await pending;
    assert.equal(h.calls.redirect.length, 0);
    const blocked = makeHarness({ userAgent: safariUA, popupError: "auth/popup-blocked" });
    await assert.rejects(blocked.auth.signInWithGoogle(), { code: "AUTH_REDIRECT_UNAVAILABLE" });
    assert.equal(blocked.calls.redirect.length, 0);
    const cancelled = makeHarness({ userAgent: safariUA, popupError: "auth/popup-closed-by-user" });
    await assert.rejects(cancelled.auth.signInWithGoogle(), { code: "auth/popup-closed-by-user" });
    assert.equal(cancelled.calls.redirect.length, 0);
    assert.equal(await cancelled.auth.submitExamToCloud("COURSE", [0]), null, "Cancelled login leaves guest APIs usable");
    console.log("✓ [UA SIMULATION / MOCK PASS] iPhone Safari uses popup and never blindly redirects; physical device remains unverified");
  }

  {
    const h = makeHarness();
    await h.login();
    const tokenCalls = [];
    h.user.getIdToken = async (force) => { tokenCalls.push(force); return force ? "fresh-id-token" : "old-id-token"; };
    let attempts = 0;
    h.setRequest(() => ++attempts === 1
      ? response({ ok: false, error: { code: "AUTH_TOKEN_EXPIRED" } }, 401)
      : response({ ok: true, registered: true, data: bundle("刷新后") }));
    await h.auth.refreshStudentBundle();
    assert.deepEqual(tokenCalls, [false, true]);
    assert.equal(attempts, 2);
    assert.equal(h.calls.fetch.at(-1).headers.Authorization, "Bearer fresh-id-token");
    attempts = 0;
    tokenCalls.length = 0;
    h.setRequest(() => { attempts++; return response({ ok: false, error: { code: "AUTH_BAD_SIGNATURE" } }, 401); });
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "AUTH_BAD_SIGNATURE" });
    assert.equal(attempts, 2, "A second auth rejection cannot cause an unbounded refresh loop");
    assert.deepEqual(tokenCalls, [false, true]);
    attempts = 0;
    tokenCalls.length = 0;
    h.setRequest(() => { attempts++; return response({ ok: false, error: { code: "AUTH_SERVER_MISCONFIG" } }, 503); });
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "AUTH_SERVER_MISCONFIG" });
    assert.equal(attempts, 1);
    assert.deepEqual(tokenCalls, [false], "Infrastructure failures must not be mistaken for expired user credentials");
    console.log("✓ [MOCK PASS] GET retries one definite 401 after forced refresh and never loops or retries a server outage");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration", "register");
    h.challenge("one-use-401-token");
    const tokenCalls = [];
    h.user.getIdToken = async (force) => { tokenCalls.push(force); return "id-token"; };
    const before = h.calls.fetch.length;
    h.setRequest(() => response({ ok: false, error: { code: "AUTH_TOKEN_EXPIRED" } }, 401));
    await assert.rejects(h.auth.registerStudentProfile({ nickname: "学员" }), { code: "AUTH_RETRY_REQUIRED", retryable: true });
    assert.equal(h.calls.fetch.length, before + 1, "A protected write cannot be automatically replayed after a 401");
    assert.deepEqual(tokenCalls, [false, true]);
    assert.equal(h.auth.getTurnstileToken(), "");
    assert.equal(h.auth.getState().cloudRetryable, true);
    await assert.rejects(h.auth.registerStudentProfile({ nickname: "学员" }, "one-use-401-token"), { code: "TURNSTILE_TOKEN_USED" });
    console.log("✓ [MOCK PASS] Write 401 refreshes credentials but requires an explicit new submission and new Turnstile token");
  }

  {
    const h = makeHarness();
    await h.login();
    const invalid = [
      { ok: true, registered: true, data: { profile: { studentNumber: "ANU1", nickname: "学员" } } },
      { ok: true, registered: true, data: { ...bundle(), profile: [] } },
      { ok: true, registered: true, data: { ...bundle(), profile: { studentNumber: " ", nickname: "学员" } } },
      { ok: true, registered: true, data: { ...bundle(), profile: { studentNumber: "ANU1", nickname: null } } },
      { ok: true, registered: true, data: { ...bundle(), transcripts: [null] } },
      { ok: true, registered: true, data: { ...bundle(), honors: [[]] } },
      { ok: true, registered: false, data: bundle() },
      { ok: true, registered: false },
      { ok: true, registered: true, data: [] }
    ];
    for (const payload of invalid) {
      h.setRequest(() => response(payload));
      await assert.rejects(h.auth.refreshStudentBundle(), { code: "INVALID_SERVER_RESPONSE" });
      assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
      assert.equal(h.auth.getState().isRegistered, true, "Malformed responses cannot erase the known archive");
    }
    h.setRequest(() => response({ ok: true, data: { profile: { nickname: "坏响应" } } }));
    await assert.rejects(h.auth.updateStudentProfile({ nickname: "新名字" }), { code: "INVALID_SERVER_RESPONSE" });
    assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
    assert.equal(h.auth.getState().cloudSaving, false);
    console.log("✓ [MOCK PASS] Strict read and mutation bundle shapes reject missing fields, arrays, invalid collections, and false registration with data");
  }

  {
    const h = makeHarness();
    await h.login();
    const before = h.calls.fetch.length;
    h.setRequest(() => response({ ok: false, error: { code: "PROFILE_UPDATE_CONFLICT", message: "Profile changed in another tab" } }, 409));
    await assert.rejects(h.auth.updateStudentProfile({ nickname: "旧标签" }), { code: "PROFILE_UPDATE_CONFLICT" });
    assert.equal(JSON.parse(h.calls.fetch.at(-1).body).expectedRevision, 0);
    assert.equal(h.calls.fetch.length, before + 1, "A stale profile update cannot be automatically replayed");
    assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
    assert.equal(h.auth.getState().cloudError.code, "PROFILE_UPDATE_CONFLICT");
    h.setRequest(() => response({ ok: true, registered: true, data: { ...bundle("另一标签"), profile: { ...bundle().profile, nickname: "另一标签", revision: 3 } } }));
    await h.auth.refreshStudentBundle();
    h.setRequest(() => response({ ok: true, data: { ...bundle("重试修改"), profile: { ...bundle().profile, nickname: "重试修改", revision: 4 } } }));
    await h.auth.updateStudentProfile({ nickname: "重试修改" });
    assert.equal(JSON.parse(h.calls.fetch.at(-1).body).expectedRevision, 3, "Explicit retry after refresh uses the new version");
    assert.equal(h.auth.getState().bundle.profile.revision, 4);
    const legacy = bundle("旧API");
    delete legacy.profile.revision;
    h.setRequest(() => response({ ok: true, registered: true, data: legacy }));
    await h.auth.refreshStudentBundle();
    h.setRequest(() => response({ ok: true, data: legacy }));
    await h.auth.updateStudentProfile({ nickname: "兼容" });
    assert.equal(JSON.parse(h.calls.fetch.at(-1).body).expectedRevision, undefined, "Missing revision remains compatible with the previous production API");
    console.log("✓ [MOCK PASS] Profile updates send the observed revision, surface 409 without replay, and support an explicit refreshed retry");
  }

  {
    const h = makeHarness();
    await h.login();
    const oldRead = deferred();
    const readSent = deferred();
    h.setRequest((url, options) => {
      if (options.method === "GET") { readSent.resolve(); return oldRead.promise; }
      return response({ ok: true, data: bundle("新修改") });
    });
    const read = h.auth.refreshStudentBundle();
    await readSent.promise;
    await h.auth.updateStudentProfile({ nickname: "新修改" });
    oldRead.resolve(response({ ok: true, registered: true, data: bundle("旧读取") }));
    await read;
    assert.equal(h.auth.getState().bundle.profile.nickname, "新修改", "A GET begun before a mutation cannot overwrite its result");
    h.auth.mountTurnstileWidget("#registration", "register");
    h.challenge("double-submit-token");
    const gate = deferred();
    const sent = deferred();
    h.setRequest(() => { sent.resolve(); return gate.promise; });
    const before = h.calls.fetch.length;
    const first = h.auth.registerStudentProfile({ nickname: "学生" });
    const second = h.auth.registerStudentProfile({ nickname: "学生" });
    await sent.promise;
    assert.equal(h.auth.getState().cloudSaving, true);
    const refresh = h.auth.refreshStudentBundle();
    await assert.rejects(h.auth.updateStudentProfile({ nickname: "并发" }), { code: "CLOUD_WRITE_IN_PROGRESS" });
    gate.resolve(response({ ok: true, data: bundle("学生") }));
    const [a, b] = await Promise.all([first, second, refresh]);
    assert.equal(a, b);
    assert.equal(h.calls.fetch.length, before + 1, "Double submit and refresh during a mutation reuse one cloud operation");
    assert.equal(h.auth.getState().cloudSaving, false);
    console.log("✓ [MOCK PASS] Old GETs cannot overwrite mutations; double registration is coalesced and concurrent writes are blocked");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration", "register");
    const old = h.challenge("registration-token");
    h.auth.mountTurnstileWidget("#registration", "import");
    assert.equal(h.auth.getTurnstileToken(), "");
    assert.equal(h.calls.render.at(-1).options.action, "import");
    old.options.callback("delayed-register-token");
    assert.equal(h.auth.getTurnstileToken(), "");
    const current = h.challenge("import-token");
    await h.auth.signOutStudent();
    current.options.callback("delayed-previous-account-token");
    assert.equal(h.auth.getTurnstileToken(), "", "A previous session's provider callback cannot restore a challenge");
    console.log("✓ [MOCK PASS] Turnstile is bound to register/import/paper/diploma actions and rejects stale session callbacks");
  }

  {
    const h = makeHarness({ fastTimeouts: true });
    await h.login();
    const delayedResponse = deferred();
    h.setRequest(() => delayedResponse.promise);
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "API_REQUEST_TIMEOUT", retryable: true });
    assert.equal(h.calls.fetch.at(-1).signal.aborted, true);
    assert.equal(h.auth.getState().cloudLoading, false);
    assert.equal(h.auth.getState().cloudRetryable, true);
    assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
    delayedResponse.resolve(response({ ok: true, registered: true, data: bundle("迟到") }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
    const delayedToken = deferred();
    const requests = h.calls.fetch.length;
    h.user.getIdToken = () => delayedToken.promise;
    await assert.rejects(h.auth.refreshStudentBundle(), { code: "API_REQUEST_TIMEOUT" });
    delayedToken.resolve("expired-request-token");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(h.calls.fetch.length, requests, "An ID token delivered after the deadline cannot trigger a request");
    const publicRead = deferred();
    h.setRequest(() => publicRead.promise);
    await assert.rejects(h.auth.lookupPublicStudentProfile("ANU1"), { code: "API_REQUEST_TIMEOUT" });
    assert.equal(h.calls.fetch.at(-1).signal.aborted, true, "Public lookups also have abort deadlines");
    publicRead.resolve(response({ ok: true, data: {} }));
    const popup = deferred();
    const authTimeout = makeHarness({ fastTimeouts: true, popupGate: popup });
    await assert.rejects(authTimeout.auth.signInWithGoogle(), { code: "AUTH_POPUP_TIMEOUT" });
    assert.equal(authTimeout.auth.getState().authSigningIn, false);
    popup.resolve({ user: authTimeout.user });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(authTimeout.auth.getState().user, null, "Late popup results cannot adopt state after their deadline");
    console.log("✓ [MOCK PASS / ACCELERATED CLOCK] API/public/token waits abort on timeout; late work cannot publish or send; popup timeout clears busy state");
  }

  {
    const popup = deferred();
    const h = makeHarness({ fastPopupTimeouts: true, popupGate: popup });
    await h.auth.prepareSignIn();
    const login = h.auth.signInWithGoogle();
    await h.emitUser(h.user);
    const result = await login;
    assert.equal(result.mode, "observer", "The SDK identity is recovered without claiming fresh popup authentication");
    assert.equal(result.user.uid, h.user.uid);
    assert.equal(h.auth.getState().authError, null);
    assert.equal(h.calls.fetch.length, 1, "Observer-first recovery reuses the completed cloud read");
    assert.equal(h.auth.getState().authSigningIn, false);
    console.log("✓ [MOCK PASS / ACCELERATED POPUP CLOCK] An SDK identity received before popup timeout remains successful without duplicate cloud reads");
  }

  {
    const popup = deferred();
    const h = makeHarness({ fastPopupTimeouts: true, popupGate: popup });
    await h.login();
    await assert.rejects(h.auth.signInWithGoogle(), { code: "AUTH_POPUP_TIMEOUT" });
    assert.equal(h.auth.getState().user.uid, h.user.uid, "A failed account switch retains the original identity");
    assert.equal(h.auth.getState().authError.code, "AUTH_POPUP_TIMEOUT", "An unchanged identity cannot prove account switching succeeded");
    assert.equal(h.calls.fetch.length, 1);
    console.log("✓ [MOCK PASS / ACCELERATED POPUP CLOCK] An unchanged existing account cannot turn a timed-out switch into success");
  }

  {
    const popup = deferred();
    const h = makeHarness({ fastPopupTimeouts: true, popupGate: popup });
    await h.auth.prepareSignIn();
    h.setRequest(() => response({ ok: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "Cloud is unavailable" } }, 503));
    const login = h.auth.signInWithGoogle();
    await h.emitUser(h.user);
    const result = await login;
    assert.equal(result.mode, "observer");
    assert.equal(result.user.uid, h.user.uid);
    assert.equal(result.cloudError.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(h.auth.getState().bundleLoaded, false);
    assert.equal(h.auth.getState().authError, null);
    assert.equal(h.calls.fetch.length, 1, "A cloud failure remains explicit instead of silently repeating the read");
    console.log("✓ [MOCK PASS / ACCELERATED POPUP CLOCK] Observer recovery preserves cloud errors without dropping identity or retrying failed reads");
  }

  {
    for (const cloudUnavailable of [false, true]) {
      const popup = deferred();
      const h = makeHarness({ popupGate: popup });
      await h.auth.prepareSignIn();
      if (cloudUnavailable) h.setRequest(() => response({
        ok: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "Cloud is unavailable" }
      }, 503));
      const login = h.auth.signInWithGoogle();
      await h.emitUser(h.user);
      popup.reject(Object.assign(new Error("Synthetic popup closed after authentication"), { code: "auth/popup-closed-by-user" }));
      const result = await login;
      assert.equal(result.mode, "observer", "A newly accepted SDK identity must survive a later popup-close race without claiming fresh popup success");
      assert.equal(result.user.uid, h.user.uid);
      assert.equal(h.auth.getState().authError, null);
      assert.equal(h.auth.getState().authSigningIn, false);
      assert.equal(h.calls.fetch.length, 1, "Popup-close recovery must reuse the observer's cloud read rather than silently retrying");
      if (cloudUnavailable) {
        assert.equal(result.cloudError.code, "UPSTREAM_UNAVAILABLE");
        assert.equal(result.cloudError.status, 503);
        assert.equal(h.auth.getState().bundleLoaded, false);
      } else {
        assert.equal(result.cloudError, null);
        assert.equal(h.auth.getState().bundleLoaded, true);
      }
    }
    console.log("✓ [MOCK PASS] Observer-first popup-close recovery preserves the new identity, completed reads and explicit cloud 503 without claiming fresh authentication");
  }

  {
    const popup = deferred();
    const h = makeHarness({ popupGate: popup });
    await h.login();
    const login = h.auth.signInWithGoogle();
    const rejected = assert.rejects(login, { code: "auth/popup-closed-by-user" });
    await h.emitUser({ ...h.user });
    popup.reject(Object.assign(new Error("Synthetic cancelled account switch"), { code: "auth/popup-closed-by-user" }));
    await rejected;
    assert.equal(h.auth.getState().user.uid, h.user.uid);
    assert.equal(h.auth.getState().authError.code, "auth/popup-closed-by-user", "The unchanged previous account must not turn a cancelled switch into success");
    assert.equal(h.calls.fetch.length, 1);
    assert.equal(h.auth.getState().authSigningIn, false);
    console.log("✓ [MOCK PASS] An observer for the unchanged previous account cannot turn a cancelled switch into success");
  }

  {
    for (const nextIntent of ["signout", "new-login"]) {
      const oldPopup = deferred();
      const h = makeHarness({ popupGate: oldPopup });
      await h.auth.prepareSignIn();
      const oldLogin = h.auth.signInWithGoogle();
      const oldRejected = assert.rejects(oldLogin, { code: "AUTH_SESSION_CHANGED" });
      await h.emitUser(h.user);
      await h.auth.signOutStudent();
      const readsAfterSignout = h.calls.fetch.length;
      let nextPopup;
      let nextLogin;
      const nextUser = { ...h.user, uid: "new-popup-account" };
      if (nextIntent === "new-login") {
        nextPopup = deferred();
        h.setPopupGate(nextPopup);
        h.setRequest(() => response({ ok: true, registered: true, data: bundle("New account") }));
        nextLogin = h.auth.signInWithGoogle();
        await h.emitUser(nextUser);
      }
      oldPopup.reject(Object.assign(new Error("Synthetic late cancellation for the old login"), { code: "auth/popup-closed-by-user" }));
      await oldRejected;
      assert.equal(h.auth.getState().authError, null, "An old cancellation must not overwrite the current intent's auth status");
      if (nextIntent === "signout") {
        await h.emitUser(h.user);
        assert.equal(h.auth.getState().user, null);
        assert.equal(h.auth.getState().bundle, null);
        assert.equal(h.auth.getState().bundleLoaded, false);
        assert.equal(h.auth.getState().authSigningIn, false);
        assert.equal(h.calls.fetch.length, readsAfterSignout, "A late cancellation or SDK observer cannot restart private reads after sign-out");
      } else {
        assert.equal(h.auth.getState().user.uid, nextUser.uid);
        assert.equal(h.auth.getState().bundle.profile.nickname, "New account");
        assert.equal(h.auth.getState().authSigningIn, true, "An old cancellation must not retire the new popup's busy state");
        nextPopup.resolve({ user: nextUser });
        assert.equal((await nextLogin).mode, "popup", "Only the new popup may complete the new intent");
        assert.equal(h.auth.getState().authSigningIn, false);
        assert.equal(h.calls.fetch.length, readsAfterSignout + 1);
      }
      console.log(`✓ [MOCK PASS] Late popup cancellation cannot restore an old identity or disturb ${nextIntent === "signout" ? "explicit sign-out" : "a newer login intent"}`);
    }
  }

  {
    for (const nextState of ["signout", "other-account"]) {
      const popup = deferred();
      const cloud = deferred();
      const h = makeHarness({ fastPopupTimeouts: true, popupGate: popup });
      await h.auth.prepareSignIn();
      h.setRequest(() => cloud.promise);
      const login = h.auth.signInWithGoogle();
      const rejected = assert.rejects(login, { code: "AUTH_SESSION_CHANGED" });
      const observer = h.emitUser(h.user);
      // Only the popup deadline is accelerated; the private read stays pending
      // until the test changes identity and releases its response.
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (nextState === "signout") {
        await h.auth.signOutStudent();
      } else {
        h.setRequest(() => response({ ok: true, registered: true, data: bundle("账号 C") }));
        await h.emitUser({ ...h.user, uid: "other-account" });
      }
      cloud.resolve(response({ ok: true, registered: true, data: bundle("旧账号 B") }));
      await observer;
      await rejected;
      assert.equal(h.auth.getState().authError, null, "An old recovery cannot overwrite the new session's auth status");
      if (nextState === "signout") {
        assert.equal(h.auth.getState().user, null);
        assert.equal(h.auth.getState().bundle, null);
      } else {
        assert.equal(h.auth.getState().user.uid, "other-account");
        assert.equal(h.auth.getState().bundle.profile.nickname, "账号 C");
      }
    }
    console.log("✓ [MOCK PASS / ACCELERATED POPUP CLOCK] Sign-out and account changes during observer recovery reject stale identity and archive results");
  }

  {
    const popup = deferred();
    const h = makeHarness({ fastTimeouts: true, popupGate: popup });
    await assert.rejects(h.auth.signInWithGoogle(), { code: "AUTH_POPUP_TIMEOUT" });
    assert.equal(h.auth.getState().authError.code, "AUTH_POPUP_TIMEOUT");
    const observed = [];
    h.auth.onStateChange((state) => observed.push({ signedIn: Boolean(state.user), error: state.authError }));
    await h.emitUser(h.user);
    assert.equal(h.auth.getState().user.uid, h.user.uid, "A late SDK auth event is distinct from the expired popup result");
    assert.equal(h.auth.getState().authError, null, "Authenticated SDK recovery retires the obsolete popup error");
    assert.equal(h.auth.getState().bundleLoaded, true);
    assert.equal(h.auth.getState().bundle.profile.nickname, "学员");
    assert.ok(observed.some((state) => state.signedIn && state.error === null), "Recovery is published to the portal before and after cloud sync");
    assert.equal(h.calls.fetch.length, 1, "Observer recovery performs one authenticated cloud read");
    console.log("✓ [MOCK PASS / ACCELERATED CLOCK] A Firebase observer arriving after popup timeout restores identity, clears stale auth error, and syncs the archive");
  }

  {
    const popup = deferred();
    const h = makeHarness({ fastTimeouts: true, popupGate: popup });
    await assert.rejects(h.auth.signInWithGoogle(), { code: "AUTH_POPUP_TIMEOUT" });
    await h.auth.signOutStudent();
    const reads = h.calls.fetch.length;
    await h.emitUser(h.user);
    assert.equal(h.auth.getState().user, null, "Explicit sign-out takes precedence over a late SDK auth event");
    assert.equal(h.auth.getState().bundle, null);
    assert.equal(h.auth.getState().bundleLoaded, false);
    assert.equal(h.auth.getState().authError, null);
    assert.equal(h.calls.fetch.length, reads, "A rejected late SDK identity cannot start private cloud reads");
    console.log("✓ [MOCK PASS / ACCELERATED CLOCK] Explicit sign-out after popup timeout still rejects late Firebase observers without restoring private data");
  }

  {
    const h = makeHarness();
    await h.login();
    const tokenGate = deferred();
    h.user.getIdToken = () => tokenGate.promise;
    const before = h.calls.fetch.length;
    const pending = h.auth.updateStudentProfile({ nickname: "签出中" });
    const rejected = assert.rejects(pending, { code: "AUTH_SESSION_CHANGED" });
    await h.auth.signOutStudent();
    await rejected;
    tokenGate.resolve("late-token");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(h.calls.fetch.length, before);
    await h.emitUser(h.user);
    assert.equal(h.auth.getState().user, null, "A late SDK observer cannot re-adopt a deliberately signed-out user");
    const popup = deferred();
    const signIn = makeHarness({ popupGate: popup });
    await signIn.auth.prepareSignIn();
    const login = signIn.auth.signInWithGoogle();
    const rejectedLogin = assert.rejects(login, { code: "AUTH_SESSION_CHANGED" });
    await signIn.auth.signOutStudent();
    popup.resolve({ user: signIn.user });
    await rejectedLogin;
    assert.equal(signIn.auth.getState().user, null);
    console.log("✓ [MOCK PASS] Sign-out immediately isolates in-flight token acquisition, popup results, and late SDK observers");
  }

  {
    const exit = deferred();
    const h = makeHarness({ signOutGate: exit });
    await h.login();
    const first = h.auth.signOutStudent();
    const second = h.auth.signOutStudent();
    assert.equal(first, second, "Repeated sign-out shares the same SDK operation");
    assert.equal(h.auth.getState().authSigningOut, true);
    assert.equal(h.auth.getState().user, null);
    await assert.rejects(h.auth.signInWithGoogle(), { code: "AUTH_SIGNOUT_IN_PROGRESS", retryable: true });
    exit.resolve();
    await first;
    assert.equal(h.auth.getState().authSigningOut, false);
    await h.auth.signInWithGoogle();
    assert.ok(h.auth.getState().user);
    console.log("✓ [MOCK PASS] Account switching waits for pending sign-out and safely resumes login afterwards");
  }

  {
    const h = makeHarness();
    await h.login();
    let deletedIdentity = false;
    h.user.delete = async () => { deletedIdentity = true; };
    h.setRequest(() => response({ ok: true, data: bundle("导出") }));
    const archive = await h.auth.exportStudentArchive();
    assert.equal(archive.data.profile.nickname, "导出");
    assert.ok(h.calls.fetch.at(-1).url.endsWith("/api/v1/me/export"));
    h.setRequest(() => response({ ok: false, error: { code: "AUTH_REQUIRES_RECENT_LOGIN" } }, 403));
    await assert.rejects(h.auth.deleteStudentAccount(), { code: "AUTH_REQUIRES_RECENT_LOGIN" });
    assert.equal(h.auth.getState().isRegistered, true);
    h.setRequest(() => response({ ok: true }));
    await assert.rejects(h.auth.deleteStudentAccount(), { code: "INVALID_SERVER_RESPONSE" });
    assert.equal(h.auth.getState().isRegistered, true);
    h.setRequest(() => response({ ok: true, deleted: true }));
    await h.auth.deleteStudentAccount();
    const request = h.calls.fetch.at(-1);
    assert.equal(JSON.parse(request.body).confirmDelete, "DELETE_MY_ANU_ARCHIVE");
    assert.equal(deletedIdentity, false, "Deleting an ANU archive must not delete the Firebase identity or Google account");
    assert.equal(h.auth.getState().user.uid, h.user.uid);
    assert.equal(h.auth.getState().bundle, null);
    assert.equal(h.auth.getState().bundleLoaded, true);
    assert.equal(h.auth.getState().isRegistered, false);
    console.log("✓ [MOCK PASS] Export uses authenticated archive endpoint; deletion requires confirmed server success and keeps Google/Firebase identity");
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runStudentAuthTests();
