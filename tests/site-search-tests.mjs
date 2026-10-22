import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const source = fs.readFileSync(new URL("../js/site-search.js", import.meta.url), "utf8");
const dataSource = fs.readFileSync(new URL("../js/i18n.js", import.meta.url), "utf8");
const published = JSON.parse(fs.readFileSync(new URL("../data/announcements.json", import.meta.url), "utf8"));
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function loadSearch() {
  const window = {};
  const forbidden = function () { throw new Error("Public search accessed private or runtime state"); };
  for (const key of ["document", "localStorage", "sessionStorage", "ANU_AUTH", "fetch", "XMLHttpRequest"]) {
    Object.defineProperty(window, key, { get: forbidden });
  }
  const sandbox = { window };
  for (const key of ["document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest"]) {
    Object.defineProperty(sandbox, key, { get: forbidden });
  }
  vm.createContext(sandbox);
  vm.runInContext(dataSource, sandbox);
  vm.runInContext(source, sandbox);
  return { data: window.ANU_DATA, api: window.ANU_SEARCH };
}

function ids(results) {
  return Array.from(results, (result) => result.id);
}

export function runSiteSearchTests() {
  const { data, api } = loadSearch();
  assert.equal(typeof api.buildIndex, "function");
  assert.equal(typeof api.search, "function");
  const index = api.buildIndex(data, published);
  const expectedPages = ["overview", "admissions", "academics", "research", "faculty", "campus", "webcams", "my-anu"];
  assert.deepEqual(Array.from(index.filter((item) => item.kind === "page"), (item) => item.page), expectedPages);
  assert.equal(new Set(ids(index)).size, index.length, "Index IDs must be unique");
  const staticIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));
  for (const item of index) {
    assert.ok(expectedPages.includes(item.page), `Unknown page ${item.page}`);
    assert.ok(staticIds.has(item.targetId), `Search target must exist in index.html: ${item.targetId}`);
    assert.equal(typeof item.title.zh, "string");
    assert.equal(typeof item.title.en, "string");
    assert.equal(typeof item.body.zh, "string");
    assert.equal(typeof item.body.en, "string");
    assert.ok(!/<\/?[a-z][^>]*>/i.test(item.title.zh + item.title.en + item.body.zh + item.body.en), "Search records must contain plain text");
  }

  const course = index.find((item) => item.id === "course:NTH-101");
  assert.ok(course);
  assert.equal(api.search(index, course.title.zh, "en")[0].id, course.id, "English UI must search Chinese content");
  assert.equal(api.search(index, course.title.en, "zh")[0].id, course.id, "Chinese UI must search English content");
  assert.deepEqual(ids(api.search(index, "  ｎｔｈ－１０１ \t", "en")), [course.id], "Course-code search normalizes NFKC, case and whitespace");
  assert.equal(api.search(index, "nth-101   拖延")[0].id, course.id, "All query terms may match different bilingual fields");
  assert.equal(api.search(index, "nth-101 不存在的额外词").length, 0, "Multi-term matching requires every term");
  for (const [query, id] of [["隐私政策", "feature:privacy-policy"], ["Privacy Policy", "feature:privacy-policy"], ["使用条款", "feature:terms-of-use"], ["Terms of Use", "feature:terms-of-use"]]) {
    const result = api.search(index, query, query.startsWith("P") || query.startsWith("T") ? "zh" : "en")[0];
    assert.equal(result.id, id, "Public privacy and terms must be searchable across languages");
    assert.equal(result.page, "my-anu");
    assert.equal(result.targetId, "privacy-terms-section");
  }
  assert.ok(api.search(index, "灾备副本").some((record) => record.id === "feature:privacy-policy"), "Public policy bodies are searchable through explicit translation keys");
  assert.ok(api.search(index, "Anti-Abuse").some((record) => record.id === "feature:terms-of-use"));
  for (const query of ["", " \n\t", "不可能存在的校园内容zz42", "<img src=x onerror=alert(1)>", ".*", "(a+)+$", "x".repeat(257), Array.from({ length: 17 }, (_, i) => `word${i}`).join(" ")]) {
    assert.equal(api.search(index, query).length, 0, `Unsafe, empty, overlong or missing queries must return []: ${query.slice(0, 50)}`);
  }
  assert.ok(api.search(index, "[").every((record) => (record.title.zh + record.title.en + record.body.zh + record.body.en + record.keywords.join(" ")).includes("[")), "Regex punctuation must be searched literally");
  for (const query of [null, undefined, {}, 404]) assert.equal(api.search(index, query).length, 0);
  assert.equal(api.search(null, "course").length, 0);
  assert.equal(api.search(index, "nth-101", "zh", 0).length, 0);
  assert.equal(api.search(index, "nth-101", "zh", -1).length, 0);

  for (const kind of ["course", "paper", "faculty", "menu", "club", "degree", "major", "honor", "template", "methodology", "topic", "webcam", "announcement", "chancellor"]) {
    const record = index.find((item) => item.kind === kind);
    assert.ok(record, `Public content must be indexed: ${kind}`);
    assert.ok(api.search(index, record.title.en, "zh").some((item) => item.id === record.id), `English content must be searchable for ${kind}`);
  }
  const notice = published.announcements[0];
  assert.equal(api.search(index, notice.id)[0].id, `announcement:${notice.id}`);
  const refreshed = api.buildIndex({}, published);
  assert.equal(refreshed.length, published.announcements.length + 1, "An announcement-only refresh must never rebuild runtime data");
  assert.ok(refreshed.every((record) => record.id.startsWith("announcement:") || record.id === "chancellor:profile"));
  assert.equal(api.buildIndex({}, published.announcements).length, published.announcements.length);
  assert.equal(api.buildIndex(null, null).length, 0);

  const makeRecord = (id, title, body = "", keywords = []) => ({
    id, page: "academics", targetId: "course-tbody", kind: "course",
    title: { zh: title, en: title }, body: { zh: body, en: body }, keywords
  });
  const ranked = [
    makeRecord("body", "Elsewhere", "needle"),
    makeRecord("partial", "Some needle course"),
    makeRecord("exact", "needle"),
    makeRecord("code", "Course with exact code", "", ["needle"]),
    makeRecord("exact", "Duplicate needle", "needle")
  ];
  const rankedResults = api.search(ranked, "needle");
  assert.deepEqual(ids(rankedResults), ["code", "exact", "partial", "body"], "Exact codes and titles rank before partial titles and body-only hits; IDs are deduplicated");
  assert.deepEqual(ids(api.search(ranked, "needle")), ids(rankedResults), "Ranking must be stable");
  assert.ok(rankedResults.every((record) => Number.isFinite(record.score)));
  const many = Array.from({ length: 80 }, (_, i) => makeRecord(`course-${i}`, "bounded"));
  assert.equal(api.search(many, "bounded").length, 24);
  assert.equal(api.search(many, "bounded", "zh", 9999).length, 50);
  assert.equal(api.search(many, "bounded", "zh", 2.9).length, 2);
  assert.equal(api.search(many, "bounded", "zh", NaN).length, 24);
  assert.equal(api.search(many, "bounded", "zh", Infinity).length, 24);
  assert.equal(api.search(many, "bounded", "zh", "80").length, 24);

  const excerpt = api.search([makeRecord("excerpt", "needle", "前文".repeat(90) + " needle " + "后文".repeat(90))], "needle")[0].snippet;
  assert.ok(excerpt.includes("needle") && excerpt.length <= 152, "Snippets must be short, plain text excerpts near a match");
  const markup = api.buildIndex({
    i18nDict: { zh: { nav_overview: "<b>公开标题</b>", hero_subtitle: "<strong>公开正文</strong>" }, en: {} }
  });
  assert.equal(markup[0].title.zh, "公开标题");
  assert.equal(markup[0].body.zh, "公开正文");

  const privateToken = "PRIVATE-CAMPUS-SECRET-946285";
  data.studentProfiles = [{ nickname: privateToken, email: privateToken }];
  data.myPapers = [{ title: privateToken }];
  data.i18nDict.zh.unlisted_private_key = privateToken;
  data.coursesByLang.zh[0].privateNote = privateToken;
  data.coursesByLang.zh[0].quiz[0].q = privateToken;
  data.coursesByLang.zh[0].quiz[0].options[0].text = privateToken;
  data.facultyByLang.en[0].privateInbox = privateToken;
  const publicCopy = structuredClone(published);
  publicCopy.studentProfiles = [{ nickname: privateToken }];
  publicCopy.announcements[0].zh.privateComment = privateToken;
  Object.defineProperty(data, "privateSession", { enumerable: true, get() { throw new Error("Private field enumerated"); } });
  const isolated = api.buildIndex(data, publicCopy);
  assert.equal(api.search(isolated, privateToken).length, 0, "Private fields, unlisted translations, quiz content and user submissions must be excluded");
  assert.ok(!JSON.stringify(isolated).includes(privateToken));

  const snapshot = JSON.stringify(isolated);
  const originalTitle = data.coursesByLang.zh[0].title;
  data.coursesByLang.zh[0].title = "SOURCE-MUTATED-AFTER-INDEX";
  data.coursesByLang.en[0].syllabus.push("MUTATED-SYLLABUS");
  data.i18nDict.zh.nav_overview = "MUTATED-PAGE-TITLE";
  publicCopy.announcements[0].zh.summary = "MUTATED-ANNOUNCEMENT";
  assert.equal(JSON.stringify(isolated), snapshot, "An index must copy static content and retain no references to its source");
  assert.equal(api.search(isolated, "SOURCE-MUTATED-AFTER-INDEX").length, 0);
  assert.equal(api.search(isolated, originalTitle)[0].id, "course:NTH-101");
  const firstResult = api.search(isolated, originalTitle)[0];
  firstResult.title.zh = "MUTATED-RESULT";
  firstResult.body.zh = "MUTATED-BODY";
  firstResult.keywords.push("MUTATED-KEYWORD");
  assert.equal(JSON.stringify(isolated), snapshot, "Editing a search result must not mutate the source index");

  console.log(`✓ [PASS] Public search (${index.length} bilingual records), relevance, input bounds, private-data exclusion and immutable snapshots verified`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) runSiteSearchTests();
