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

function makeHarness({ origin = "https://freeze.edu.kg", sdkGate, scriptLoaded = true, popupError, firebase } = {}) {
  const calls = { fetch: [], popup: [], redirect: [], initialize: [], render: [], reset: [], remove: [] };
  const elements = new Map();
  let theme = "light";
  let observer;
  let nextRequest = () => response({ ok: true, registered: true, data: { profile: { nickname: "学员" } } });
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
    navigator: { userAgent: "Mozilla/5.0 Safari", platform: "MacIntel", maxTouchPoints: 0 },
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
      async setPersistence() { if (sdkGate) await sdkGate.promise; },
      async getRedirectResult() { return null; },
      onAuthStateChanged(auth, callback) { observer = callback; },
      GoogleAuthProvider: class { setCustomParameters() {} },
      async signInWithPopup(auth) {
        calls.popup.push(auth);
        if (popupError) throw Object.assign(new Error(popupError), { code: popupError });
        return { user };
      },
      async signInWithRedirect(auth) { calls.redirect.push(auth); },
      async signOut() {}
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
    console.log("✓ [PASS] Firebase initialization is idempotent and popup waits for a valid Auth instance");
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
    h.setRequest(() => response({ ok: true, registered: true, data: { profile: { nickname: "已注册" } } }));
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
    console.log("✓ [PASS] Cloud failures reject manual refresh, remain handled in auth observers, and preserve known profile state");
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
    console.log("✓ [PASS] Redirect fallback requires same-origin authDomain and distinguishes redirect from popup success");
  }

  {
    const h = makeHarness();
    h.auth.mountTurnstileWidget("#registration");
    h.challenge();
    h.auth.mountTurnstileWidget("#registration");
    assert.equal(h.calls.render.length, 1, "Repeated session/page updates must not remount an unchanged widget");
    assert.equal(h.auth.getTurnstileToken(), "fresh-challenge");
    h.setTheme("dark");
    h.auth.mountTurnstileWidget("#registration");
    assert.equal(h.calls.remove.length, 1);
    assert.equal(h.calls.render.at(-1).options.theme, "dark");
    assert.equal(h.auth.getTurnstileToken(), "");
    const old = h.challenge("old-widget-token");
    h.auth.mountTurnstileWidget("#paper");
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
    loading.auth.mountTurnstileWidget("#registration");
    loading.auth.mountTurnstileWidget("#registration");
    loading.auth.mountTurnstileWidget("#paper");
    assert.equal(loading.script.listeners.load.length, 1, "A loading script has one mount callback");
    loading.loadTurnstile();
    assert.equal(loading.calls.render.length, 1);
    assert.equal(loading.calls.render[0].container.selector, "#paper", "Deferred mount uses the current page's container");
    const retry = makeHarness({ scriptLoaded: false });
    retry.auth.mountTurnstileWidget("#registration");
    const failedScript = retry.script;
    retry.failTurnstileScript();
    assert.equal(retry.script, null, "A failed script is removed so the next mount can retry loading");
    retry.auth.mountTurnstileWidget("#paper");
    assert.notEqual(retry.script, failedScript);
    assert.equal(retry.scripts.length, 2);
    assert.equal(retry.script.src, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    retry.loadTurnstile();
    assert.equal(retry.calls.render.length, 1);
    assert.equal(retry.calls.render[0].container.selector, "#paper");
    console.log("✓ [PASS] Turnstile mounts once per container/theme and clears expired, failed, removed, and signed-out challenges");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration");
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
    await assert.rejects(h.auth.submitDiplomaToCloud({ recipientName: "学员" }), /Network disconnected/);
    assert.equal(h.calls.reset.length, 3, "Failed transmission still resets the challenge");
    console.log("✓ [PASS] Protected writes require a fresh challenge, reset after every send, and reject concurrent or reused tokens");
  }

  {
    const h = makeHarness();
    await h.login();
    h.auth.mountTurnstileWidget("#registration");
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
    console.log("✓ [PASS] Import idempotency uses stable full-content SHA-256 keys and one-use challenges");
  }

  {
    const h = makeHarness();
    await h.login();
    const gate = deferred();
    h.setRequest(() => gate.promise);
    const refresh = h.auth.refreshStudentBundle();
    await h.auth.signOutStudent();
    gate.resolve(response({ ok: true, registered: true, data: { profile: { nickname: "旧账号" } } }));
    await assert.rejects(refresh, { code: "AUTH_SESSION_CHANGED" });
    assert.equal(h.auth.getState().user, null);
    assert.equal(h.auth.getState().bundle, null, "A late response must not restore a signed-out account's archive");
    assert.equal(h.auth.getState().bundleLoaded, false);
    console.log("✓ [PASS] Late cloud responses cannot restore archives after sign-out");
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
          if (options.method === "GET") return response({ ok: true, registered: true, data: { profile: { nickname: "新账号" } } });
          sent.resolve();
          return gate.promise;
        });
        const pending = invoke(h.auth);
        await sent.promise;
        if (transition === "sign-out") {
          await h.auth.signOutStudent();
        } else {
          await h.emitUser({ uid: "second-user", getIdToken: async () => "second-user-token" });
        }
        gate.resolve(response({ ok: true, data: { profile: { nickname: "旧账号迟到响应" } } }));
        await assert.rejects(pending, { code: "AUTH_SESSION_CHANGED" }, `${label} must reject a late response following ${transition}`);
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
    await h.emitUser({ uid: "second-user", getIdToken: async () => "second-user-token" });
    tokenGate.resolve("late-first-user-token");
    await assert.rejects(pending, { code: "AUTH_SESSION_CHANGED" });
    assert.equal(h.calls.fetch.length, requestCount + 1, "Only the new user's profile read may be sent after switching during token acquisition");
    assert.ok(h.calls.fetch.slice(requestCount).every((request) => request.method === "GET" && request.headers.Authorization === "Bearer second-user-token"));
    assert.equal(h.auth.getState().user.uid, "second-user");
    console.log("✓ [PASS] Profile, exam, and honor writes isolate late responses and reject stale ID tokens before sending");
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runStudentAuthTests();
