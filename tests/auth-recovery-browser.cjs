/*
 * Local Chrome UI verification for late authentication feedback recovery.
 * ANU_AUTH is an isolated fixture at its public getState/onStateChange boundary.
 * This does not exercise Firebase, Google OAuth, Turnstile, or production APIs.
 * Browser plugin skill is unavailable; independent Playwright was explicitly
 * permitted for this fixture task. No existing browser profile is opened.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }
catch (_) { playwright = require(path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const BASE = "http://127.0.0.1:8091";
const OUT = process.env.ANU_AUTH_RECOVERY_EVIDENCE_DIR || path.join(os.tmpdir(), "anu-auth-recovery-browser");
fs.mkdirSync(OUT, { recursive: true, mode: 0o700 });

const AUTH_FIXTURE = `(() => {
  const listeners = [];
  const state = { authReady:true, isConfigured:true, user:null, isRegistered:false,
    bundle:null, bundleLoaded:false, cloudLoading:false, cloudError:null,
    authError:null, authInitializing:false, authSigningIn:false,
    authSigningOut:false, cloudSaving:false, cloudRetryable:false };
  const notify = () => listeners.forEach(fn => fn({...state}));
  window.__authRecoveryEmit = patch => { Object.assign(state, patch); notify(); };
  window.ANU_AUTH = {
    getState:()=>({...state}), onStateChange:fn=>listeners.push(fn),
    initAuth:async()=>{notify();}, prepareSignIn:async()=>{},
    isFirebaseConfigured:()=>true,
    signInWithGoogle:async()=>{
      state.authError={code:'AUTH_POPUP_TIMEOUT'}; notify();
      throw Object.assign(new Error('Isolated fixture timeout'),state.authError);
    },
    signOutStudent:async()=>{Object.assign(state,{user:null,authError:null});notify();},
    mountTurnstileWidget:()=>{}, renderCrestAvatarSvg:()=>{}
  };
})();`;

function serve() {
  const types = { ".html":"text/html; charset=utf-8", ".js":"application/javascript", ".css":"text/css", ".svg":"image/svg+xml", ".png":"image/png" };
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, BASE).pathname);
    const filename = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403); return response.end(); }
    fs.readFile(filename, (error, content) => {
      response.writeHead(error ? 404 : 200, { "Content-Type":types[path.extname(filename)] || "application/octet-stream" });
      response.end(error ? "Not found" : content);
    });
  });
  return new Promise((resolve,reject)=>{server.once("error",reject);server.listen(8091,"127.0.0.1",()=>resolve(server));});
}

async function run() {
  const summary = { result:"FAIL", date:new Date().toISOString().slice(0,10), base:BASE,
    mode:"Real isolated Chrome rendering; ANU_AUTH public-interface fixture; external networking blocked; no real OAuth or production data",
    browserPlugin:"Browser plugin skill unavailable; parent explicitly permitted independent Playwright fixture",
    checks:[],screenshots:[],errors:[],unexpectedExternal:[] };
  let browser,server;
  try {
    server = await serve();
    browser = await playwright.chromium.launch({channel:process.env.ANU_CHROME_CHANNEL || "chrome",headless:true});
    for (const lang of ["zh","en"]) for (const width of [390,1440]) {
      const context = await browser.newContext({viewport:{width,height:1000},colorScheme:"dark",acceptDownloads:true,reducedMotion:"reduce"});
      await context.addInitScript(lang=>localStorage.setItem("anu_lang",lang),lang);
      await context.route("**/*",route=>{
        const url = new URL(route.request().url());
        if (url.origin===BASE && url.pathname==="/js/student-auth.js") return route.fulfill({contentType:"application/javascript",body:AUTH_FIXTURE});
        if (url.origin===BASE) return route.continue();
        if (url.hostname==="fonts.googleapis.com") return route.fulfill({contentType:"text/css",body:"/* isolated system fonts */"});
        summary.unexpectedExternal.push(url.origin+url.pathname);
        return route.fulfill({status:200,contentType:"text/plain",body:"isolated"});
      });
      const page = await context.newPage();
      page.on("pageerror",e=>summary.errors.push(e.message));
      page.on("console",m=>{if(m.type()==="error")summary.errors.push(m.text());});
      await page.goto(BASE+"/#my-anu");
      await page.waitForFunction(()=>window.ANU_AUTH?.getState().authReady);
      assert.match(await page.title(),/Absolutely Nothing University/);
      assert.ok((await page.locator("#page-my-anu").innerText()).length>200);
      assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
      assert.equal(await page.locator("body").innerText().then(t=>/Application error|Internal Server Error|webpack error/i.test(t)),false);
      const feedback = page.locator("#my-anu-global-feedback");
      const timeout = lang==="zh" ? /登录窗口等待超时/ : /Sign-in window timed out/;
      const success = lang==="zh" ? "✓ Google 账号登录成功！" : "✓ Signed in with Google!";
      const emit = patch=>page.evaluate(patch=>window.__authRecoveryEmit(patch),patch);
      const user = {uid:"fixture-late-user",displayName:"Isolated QA",email:"fixture@example.invalid"};
      const failLogin = async()=>{
        await emit({user:null,bundle:null,bundleLoaded:false,cloudError:null,authError:null});
        await page.locator("#google-signin-btn").click();
        await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector("#my-anu-global-feedback").textContent),timeout.source);
        assert.equal(await page.locator("#google-signin-btn").isEnabled(),true);
      };
      const shot = async name=>{
        const filename=path.join(OUT,`${lang}-${width}-${name}.png`);
        await page.screenshot({path:filename,fullPage:false});fs.chmodSync(filename,0o600);summary.screenshots.push(filename);
      };

      await failLogin();await shot("timeout");
      await emit({user,authError:null,bundleLoaded:false});
      assert.equal(await feedback.innerText(),success);
      assert.equal(await page.locator("#google-signout-btn").isVisible(),true);
      assert.equal(await page.locator("#my-anu-registration-panel").isVisible(),false);
      assert.doesNotMatch(await feedback.innerText(),timeout);
      await shot("recovered");
      summary.checks.push(`${lang}/${width}: late accepted observer replaces stale timeout with signed-in notice`);

      await failLogin();
      const pendingDownload = page.waitForEvent("download");
      await page.locator("#export-archive-btn").click();
      const download=await pendingDownload;assert.equal(await download.failure(),null);
      const exportFeedback=await feedback.innerText();assert.ok(exportFeedback && !timeout.test(exportFeedback));
      await emit({user,authError:null,bundleLoaded:false});
      assert.equal(await feedback.innerText(),exportFeedback,"Late auth must not overwrite another operation's feedback");
      summary.checks.push(`${lang}/${width}: real local JSON-export feedback survives late authentication`);

      await failLogin();
      await emit({user,authError:null,bundleLoaded:false,cloudError:{code:"SERVICE_UNAVAILABLE",message:"Fixture Worker unavailable"},cloudRetryable:true});
      const cloudFeedback=await feedback.innerText();
      assert.match(cloudFeedback,lang==="zh"?/云端档案暂时无法同步/:/Cloud archive unavailable/);
      assert.doesNotMatch(cloudFeedback,timeout);
      assert.notEqual(cloudFeedback,success);
      assert.equal(await page.locator("#sync-cloud-btn").isVisible(),true);
      assert.equal(await page.locator("#my-anu-registration-panel").isVisible(),false);
      await shot("cloud-unavailable");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      summary.checks.push(`${lang}/${width}: cloud failure remains visible after auth recovery; blue/white portal has no horizontal overflow`);
      await context.close();
    }
    assert.deepEqual(summary.errors,[]);assert.deepEqual(summary.unexpectedExternal,[]);
    summary.result="PASS";
  } finally {
    const target=path.join(OUT,"results.json");fs.writeFileSync(target,JSON.stringify(summary,null,2)+"\n",{mode:0o600});
    console.log(JSON.stringify(summary,null,2));
    if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
