import {
  CITATIONS_POOL,
  COLLEGE_NAMES,
  type CollegeKey,
  COURSE_EXAMS,
  DEGREE_OPTIONS,
  HONOR_TITLES,
  JOURNAL_OPTIONS,
  MAJOR_OPTIONS,
  METHODOLOGY_OPTIONS,
  OFFICIAL_BADGES,
  PEER_REVIEW_POOL,
  VALID_COLLEGES
} from "./catalog.ts";
import {
  AuthVerificationError,
  extractBearerToken,
  verifyFirebaseIdToken
} from "./middleware/firebaseAuth.ts";
import {
  checkRateLimit,
  containsForbiddenClientIdentityField,
  isFeatureEnabled,
  recordAuditLog,
  verifyAdminAuthorization,
  verifyTurnstileToken
} from "./middleware/security.ts";
import type { D1PreparedStatement, Env, StudentRecord, VerifiedFirebaseUser } from "./types.ts";
import {
  generateId,
  generateStudentNumber,
  sanitizeAvatarSeed,
  sanitizeAvatarUrl,
  sanitizePlainText,
  sha256Hex
} from "./utils/crypto.ts";
import {
  buildSecurityHeaders,
  errorResponse,
  getAllowedOrigin,
  jsonResponse
} from "./utils/http.ts";

const MAX_EXAMS_PER_STUDENT = 50;
const MAX_PAPERS_PER_STUDENT = 30;
const MAX_DIPLOMAS_PER_STUDENT = 20;

async function parseSafeJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const contentLength = parseInt(request.headers.get("Content-Length") || "0", 10);
    if (contentLength > 65536) {
      return null;
    }
    const text = await request.text();
    if (!text || text.length > 65536) {
      return null;
    }
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function grantBadgeIfAbsent(
  env: Env,
  uid: string,
  badgeKey: string
): Promise<boolean> {
  const spec = OFFICIAL_BADGES[badgeKey];
  if (!spec) return false;
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO honors_achievements
      (id, firebase_uid, badge_key, badge_category, title_zh, title_en, desc_zh, desc_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      generateId(),
      uid,
      spec.key,
      spec.category,
      spec.titleZh,
      spec.titleEn,
      spec.descZh,
      spec.descEn
    )
    .run();
  return Boolean(res.meta && res.meta.changes && res.meta.changes > 0);
}

function gradeCourseExamServerSide(
  courseCode: string,
  answers: unknown
): {
  score: number;
  grade: "A+" | "B+" | "F";
  gradeLabelZh: string;
  gradeLabelEn: string;
  verdictZh: string;
  verdictEn: string;
  normalizedAnswers: number[];
} | null {
  const spec = COURSE_EXAMS[courseCode];
  if (!spec) return null;
  if (!Array.isArray(answers) || answers.length !== spec.validOptionScores.length) {
    return null;
  }

  let totalScore = 0;
  const normalizedAnswers: number[] = [];

  for (let i = 0; i < spec.validOptionScores.length; i++) {
    const rawAns = answers[i];
    if (typeof rawAns !== "number" || !Number.isInteger(rawAns)) {
      return null;
    }
    const allowedScoresForQuestion = spec.validOptionScores[i];
    // Accept either option index (0, 1, 2) or exact valid option score
    let resolvedScore: number | undefined;
    if (rawAns >= 0 && rawAns < allowedScoresForQuestion.length) {
      resolvedScore = allowedScoresForQuestion[rawAns];
    } else if (allowedScoresForQuestion.includes(rawAns)) {
      resolvedScore = rawAns;
    }
    if (resolvedScore === undefined) {
      return null;
    }
    normalizedAnswers.push(resolvedScore);
    totalScore += resolvedScore;
  }

  totalScore = Math.max(0, Math.min(100, totalScore));

  let grade: "A+" | "B+" | "F" = "A+";
  let gradeLabelZh = "";
  let gradeLabelEn = "";
  let verdictZh = "";
  let verdictEn = "";

  if (totalScore >= 85) {
    grade = "A+";
    gradeLabelZh = `最终摸鱼成绩：${totalScore} / 100 · 等级：A+（免修保博）`;
    gradeLabelEn = `Final Slacking Score: ${totalScore} / 100 · Grade: A+ (Direct Ph.D. Track)`;
    verdictZh = `主讲教授 ${spec.profZh} 评语：“极具天赋！您对逃避工作的理解已经超越了教材本身，教务处决定直接免除您未来十年的所有早八考勤。”`;
    verdictEn = `Instructor ${spec.profEn}'s Verdict: "Extraordinary natural talent! Your mastery of avoiding effort surpasses the syllabus itself."`;
  } else if (totalScore >= 50) {
    grade = "B+";
    gradeLabelZh = `最终摸鱼成绩：${totalScore} / 100 · 等级：B+（尚有内卷残留）`;
    gradeLabelEn = `Final Slacking Score: ${totalScore} / 100 · Grade: B+ (Mild Hustle Residue)`;
    verdictZh = `主讲教授 ${spec.profZh} 评语：“您已经掌握了基本的糊弄技巧，但偶尔还会产生‘要不要努努力’的危险念头，建议去食堂加餐一份炸鸡巩固道心。”`;
    verdictEn = `Instructor ${spec.profEn}'s Verdict: "Solid slacking fundamentals, though we detected slight traces of ambition. Prescribed 2 hours of sofa rest."`;
  } else {
    grade = "F";
    gradeLabelZh = `最终摸鱼成绩：${totalScore} / 100 · 等级：F（因过于勤奋被判挂科）`;
    gradeLabelEn = `Final Slacking Score: ${totalScore} / 100 · Grade: F (Failed Due to Excessive Diligence)`;
    verdictZh = `主讲教授 ${spec.profZh} 警告：“严重违纪！您居然试图认真完成任务，这严重违背了我校‘什么都不做’的创校宪章，罚您立刻去睡午觉补考！”`;
    verdictEn = `Instructor ${spec.profEn}'s Warning: "Severe academic violation! You actually tried to be productive. Sentenced to an immediate compensatory nap!"`;
  }

  return {
    score: totalScore,
    grade,
    gradeLabelZh,
    gradeLabelEn,
    verdictZh,
    verdictEn,
    normalizedAnswers
  };
}

async function fetchFullStudentBundle(env: Env, uid: string) {
  const student = await env.DB.prepare(
    "SELECT * FROM students WHERE firebase_uid = ?"
  )
    .bind(uid)
    .first<StudentRecord>();

  if (!student) {
    return null;
  }

  const [transcriptsRes, papersRes, diplomasRes, honorsRes] = await Promise.all([
    env.DB.prepare(
      "SELECT id, course_code, course_title_zh, course_title_en, score, grade, grade_label_zh, grade_label_en, verdict_zh, verdict_en, created_at FROM transcripts WHERE firebase_uid = ? ORDER BY created_at DESC LIMIT 50"
    )
      .bind(uid)
      .all(),
    env.DB.prepare(
      "SELECT id, void_id, title, author_display, journal_idx, journal_zh, journal_en, methodology_idx, content_zh, content_en, footnote_zh, footnote_en, reviewer_header_zh, reviewer_header_en, review_zh, review_en, citations_zh, citations_en, created_at FROM papers WHERE firebase_uid = ? ORDER BY created_at DESC LIMIT 30"
    )
      .bind(uid)
      .all(),
    env.DB.prepare(
      "SELECT id, serial_number, recipient_name, degree_idx, degree_zh, degree_en, major_idx, major_zh, major_en, honor_idx, honor_zh, honor_en, citation_idx, template_id, cert_lang, is_stamped, issued_date, created_at FROM diplomas WHERE firebase_uid = ? ORDER BY created_at DESC LIMIT 20"
    )
      .bind(uid)
      .all(),
    env.DB.prepare(
      "SELECT id, badge_key, badge_category, title_zh, title_en, desc_zh, desc_en, unlocked_at FROM honors_achievements WHERE firebase_uid = ? ORDER BY unlocked_at DESC LIMIT 50"
    )
      .bind(uid)
      .all()
  ]);

  const collegeInfo = COLLEGE_NAMES[student.college] || COLLEGE_NAMES.retreat;

  return {
    profile: {
      studentNumber: student.student_number,
      nickname: student.nickname,
      avatarSeed: student.avatar_seed,
      avatarUrl: student.avatar_url,
      college: student.college,
      collegeNameZh: collegeInfo.zh,
      collegeNameEn: collegeInfo.en,
      major: student.major,
      enrollmentYear: student.enrollment_year,
      enrollmentDate: student.enrollment_date,
      fictionalHonor: student.fictional_honor,
      visibility: student.visibility,
      publicConsent: student.public_consent === 1,
      publicConsentAt: student.public_consent_at,
      idleSeconds: student.idle_seconds,
      createdAt: student.created_at,
      updatedAt: student.updated_at
    },
    transcripts: transcriptsRes.results || [],
    papers: papersRes.results || [],
    diplomas: diplomasRes.results || [],
    honors: honorsRes.results || []
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = generateId();
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method.toUpperCase();
    const originHeader = request.headers.get("Origin");
    const allowedOrigin = getAllowedOrigin(request, env);

    // 1. Strict CORS Enforcement: If an Origin header is present and not in whitelist, reject immediately
    if (originHeader && !allowedOrigin) {
      return errorResponse(
        "CORS_ORIGIN_FORBIDDEN",
        "Origin is not authorized to access this API.",
        403,
        null,
        requestId
      );
    }

    // Handle CORS Preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildSecurityHeaders(allowedOrigin, requestId)
      });
    }

    try {
      const clientIp =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "0.0.0.0";
      const ipHash = await sha256Hex(`${clientIp}:${env.IP_HASH_SALT || "anu-default-salt"}`);

      // 2. IP-dimension Rate Limiting
      const ipLimitPerMin = parseInt(env.RATE_LIMIT_IP_PER_MIN || "60", 10) || 60;
      const ipRate = await checkRateLimit(env, "ip", ipHash, ipLimitPerMin, 60);
      if (!ipRate.allowed) {
        return errorResponse(
          "RATE_LIMIT_EXCEEDED",
          "Too many requests from this network. Please take a nap and try again shortly.",
          429,
          allowedOrigin,
          requestId
        );
      }

      // 3. Public Health & System Switches Endpoint
      if (method === "GET" && (path === "/api/v1/health" || path === "/api/v1/system/status")) {
        const flagsRes = await env.DB.prepare(
          "SELECT flag_key, enabled FROM system_flags"
        ).all<{ flag_key: string; enabled: number }>();
        const flags: Record<string, boolean> = {};
        for (const r of flagsRes.results || []) {
          flags[r.flag_key] = r.enabled === 1;
        }
        return jsonResponse(
          {
            ok: true,
            service: "ANU Student Archive API",
            university: "Absolutely Nothing University (freeze.edu.kg)",
            features: {
              registrationEnabled: flags.registration_enabled ?? true,
              paperSubmissionEnabled: flags.paper_submission_enabled ?? true,
              diplomaRegistrationEnabled: flags.diploma_registration_enabled ?? true,
              publicDirectoryEnabled: flags.public_directory_enabled ?? true
            }
          },
          200,
          allowedOrigin,
          requestId
        );
      }

      // 4. Public Student Profile Lookup by Student Number (Read-only, requires explicit public consent)
      // Note: Student Number is NEVER accepted as authentication credential.
      if (method === "GET" && path.startsWith("/api/v1/public/profile/")) {
        const publicDirEnabled = await isFeatureEnabled(env, "public_directory_enabled");
        if (!publicDirEnabled) {
          return errorResponse(
            "FEATURE_PAUSED",
            "Public student directory lookup is temporarily paused.",
            503,
            allowedOrigin,
            requestId
          );
        }

        const studentNumber = decodeURIComponent(path.slice("/api/v1/public/profile/".length)).trim();
        if (!/^ANU-\d{4}-[A-Z0-9]{6}$/.test(studentNumber)) {
          return errorResponse(
            "INVALID_STUDENT_NUMBER",
            "Invalid ANU student number format.",
            400,
            allowedOrigin,
            requestId
          );
        }

        const student = await env.DB.prepare(
          "SELECT student_number, nickname, avatar_seed, college, major, enrollment_year, fictional_honor, visibility, public_consent FROM students WHERE student_number = ?"
        )
          .bind(studentNumber)
          .first<StudentRecord>();

        if (!student || student.visibility !== "public" || student.public_consent !== 1) {
          return errorResponse(
            "PROFILE_NOT_PUBLIC",
            "No public student record found for this student number.",
            404,
            allowedOrigin,
            requestId
          );
        }

        const collegeInfo = COLLEGE_NAMES[student.college] || COLLEGE_NAMES.retreat;
        return jsonResponse(
          {
            ok: true,
            publicProfile: {
              studentNumber: student.student_number,
              nickname: student.nickname,
              avatarSeed: student.avatar_seed,
              college: student.college,
              collegeNameZh: collegeInfo.zh,
              collegeNameEn: collegeInfo.en,
              major: student.major,
              enrollmentYear: student.enrollment_year,
              fictionalHonor: student.fictional_honor
            }
          },
          200,
          allowedOrigin,
          requestId
        );
      }

      // 5. Strictly Restricted Admin Endpoints (/api/v1/admin/*)
      if (path.startsWith("/api/v1/admin")) {
        if (!verifyAdminAuthorization(request, env)) {
          await recordAuditLog(env, "ADMIN_AUTH_REJECTED", "anonymous", ipHash, { path, method });
          return errorResponse(
            "ADMIN_FORBIDDEN",
            "Administrative authorization required.",
            403,
            allowedOrigin,
            requestId
          );
        }

        if (method === "GET" && path === "/api/v1/admin/flags") {
          const flags = await env.DB.prepare(
            "SELECT flag_key, enabled, updated_at, updated_by, note FROM system_flags ORDER BY flag_key ASC"
          ).all();
          return jsonResponse({ ok: true, flags: flags.results || [] }, 200, allowedOrigin, requestId);
        }

        if (method === "PUT" && path === "/api/v1/admin/flags") {
          const body = await parseSafeJson(request);
          if (!body || typeof body.flagKey !== "string" || typeof body.enabled !== "boolean") {
            return errorResponse("INVALID_PAYLOAD", "Expected flagKey (string) and enabled (boolean).", 400, allowedOrigin, requestId);
          }

          const allowedFlags = [
            "registration_enabled",
            "paper_submission_enabled",
            "diploma_registration_enabled",
            "public_directory_enabled"
          ];
          if (!allowedFlags.includes(body.flagKey)) {
            return errorResponse("INVALID_FLAG_KEY", "Unsupported system flag key.", 400, allowedOrigin, requestId);
          }

          const note = sanitizePlainText(body.note, 200, "");
          await env.DB.prepare(
            "UPDATE system_flags SET enabled = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_by = 'admin', note = CASE WHEN ? != '' THEN ? ELSE note END WHERE flag_key = ?"
          )
            .bind(body.enabled ? 1 : 0, note, note, body.flagKey)
            .run();

          await recordAuditLog(env, "ADMIN_FLAG_UPDATED", "admin", ipHash, {
            flagKey: body.flagKey,
            enabled: body.enabled
          });

          return jsonResponse(
            { ok: true, flagKey: body.flagKey, enabled: body.enabled },
            200,
            allowedOrigin,
            requestId
          );
        }

        return errorResponse("NOT_FOUND", "Admin endpoint not found.", 404, allowedOrigin, requestId);
      }

      // ======================================================================
      // 6. Unified Firebase Authentication Middleware for all /api/v1/me* routes
      // ======================================================================
      if (!path.startsWith("/api/v1/me")) {
        return errorResponse("NOT_FOUND", "Endpoint not found.", 404, allowedOrigin, requestId);
      }

      const bearerToken = extractBearerToken(request);
      if (!bearerToken) {
        return errorResponse(
          "AUTH_REQUIRED",
          "Bearer authentication token is required.",
          401,
          allowedOrigin,
          requestId
        );
      }

      let verifiedUser: VerifiedFirebaseUser;
      try {
        verifiedUser = await verifyFirebaseIdToken(bearerToken, env);
      } catch (err) {
        const code = err instanceof AuthVerificationError ? err.code : "AUTH_INVALID_TOKEN";
        const msg =
          err instanceof AuthVerificationError
            ? err.message
            : "Authentication token verification failed.";
        return errorResponse(code, msg, 401, allowedOrigin, requestId);
      }

      const uid = verifiedUser.uid;

      // Per-UID Rate Limiting
      const uidLimitPerMin = parseInt(env.RATE_LIMIT_UID_PER_MIN || "30", 10) || 30;
      const uidRate = await checkRateLimit(env, "uid", uid, uidLimitPerMin, 60);
      if (!uidRate.allowed) {
        return errorResponse(
          "RATE_LIMIT_UID_EXCEEDED",
          "Account request rate limit exceeded. Please pause and try again shortly.",
          429,
          allowedOrigin,
          requestId
        );
      }

      // Reject any query string attempting to pass a UID or student_number to override identity
      if (
        url.searchParams.has("uid") ||
        url.searchParams.has("firebase_uid") ||
        url.searchParams.has("user_id")
      ) {
        return errorResponse(
          "IDENTITY_OVERRIDE_FORBIDDEN",
          "Client-supplied UID parameters are strictly forbidden.",
          400,
          allowedOrigin,
          requestId
        );
      }

      // 7. GET /api/v1/me - Retrieve current authenticated user's profile & campus archive
      if (method === "GET" && path === "/api/v1/me") {
        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse(
          {
            ok: true,
            registered: Boolean(bundle),
            authAccount: {
              email: verifiedUser.email || null,
              displayName: verifiedUser.name || null,
              photoUrl: sanitizeAvatarUrl(verifiedUser.picture)
            },
            data: bundle
          },
          200,
          allowedOrigin,
          requestId
        );
      }

      // Write rate limit check for POST / PATCH / PUT / DELETE under /api/v1/me
      if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
        const writeLimitPerHour = parseInt(env.RATE_LIMIT_WRITE_PER_HOUR || "25", 10) || 25;
        const writeRate = await checkRateLimit(env, "write", uid, writeLimitPerHour, 3600);
        if (!writeRate.allowed) {
          return errorResponse(
            "WRITE_QUOTA_EXCEEDED",
            "Hourly write limit reached for this student account.",
            429,
            allowedOrigin,
            requestId
          );
        }
      }

      // 8. DELETE /api/v1/me - Account & Campus Profile Deletion (Right to Erasure)
      if (method === "DELETE" && path === "/api/v1/me") {
        const body = await parseSafeJson(request);
        if (body && containsForbiddenClientIdentityField(body)) {
          return errorResponse(
            "IDENTITY_OVERRIDE_FORBIDDEN",
            "Client-supplied identity fields are not allowed.",
            400,
            allowedOrigin,
            requestId
          );
        }
        if (!body || body.confirmDelete !== "DELETE_MY_ANU_ARCHIVE") {
          return errorResponse(
            "CONFIRMATION_REQUIRED",
            "Account deletion requires confirmDelete: 'DELETE_MY_ANU_ARCHIVE'.",
            400,
            allowedOrigin,
            requestId
          );
        }

        // Explicit ownership deletion across all tables (also enforced by ON DELETE CASCADE)
        await env.DB.batch([
          env.DB.prepare("DELETE FROM transcripts WHERE firebase_uid = ?").bind(uid),
          env.DB.prepare("DELETE FROM papers WHERE firebase_uid = ?").bind(uid),
          env.DB.prepare("DELETE FROM diplomas WHERE firebase_uid = ?").bind(uid),
          env.DB.prepare("DELETE FROM honors_achievements WHERE firebase_uid = ?").bind(uid),
          env.DB.prepare("DELETE FROM idempotency_keys WHERE firebase_uid = ?").bind(uid),
          env.DB.prepare("DELETE FROM students WHERE firebase_uid = ?").bind(uid)
        ]);

        await recordAuditLog(env, "STUDENT_ACCOUNT_DELETED", await sha256Hex(uid), ipHash);

        return jsonResponse(
          {
            ok: true,
            deleted: true,
            message: "Your ANU student profile and all synced records have been permanently deleted."
          },
          200,
          allowedOrigin,
          requestId
        );
      }

      // Parse JSON body for POST/PATCH requests and enforce anti-ID-spoofing rule
      const body = await parseSafeJson(request);
      if (!body) {
        return errorResponse(
          "INVALID_JSON_BODY",
          "Request body must be a valid JSON object under 64KB.",
          400,
          allowedOrigin,
          requestId
        );
      }

      if (containsForbiddenClientIdentityField(body)) {
        return errorResponse(
          "IDENTITY_OVERRIDE_FORBIDDEN",
          "Do not supply uid or firebase_uid in request payload; identity is derived solely from verified token.",
          400,
          allowedOrigin,
          requestId
        );
      }

      // 9. POST /api/v1/me/register - Create Student Campus Profile (1-to-1 with Firebase UID)
      if (method === "POST" && path === "/api/v1/me/register") {
        const regEnabled = await isFeatureEnabled(env, "registration_enabled");
        if (!regEnabled) {
          return errorResponse(
            "REGISTRATION_PAUSED",
            "New student registrations are currently paused by the Office of the Provost.",
            503,
            allowedOrigin,
            requestId
          );
        }

        // Verify Turnstile token on registration
        const turnstileToken =
          request.headers.get("X-Turnstile-Token") ||
          (typeof body.turnstileToken === "string" ? body.turnstileToken : "");
        const turnstileOk = await verifyTurnstileToken(env, turnstileToken, clientIp);
        if (!turnstileOk) {
          return errorResponse(
            "TURNSTILE_VERIFICATION_FAILED",
            "Human verification (Cloudflare Turnstile) failed or is missing.",
            403,
            allowedOrigin,
            requestId
          );
        }

        if (body.acceptTerms !== true || body.acceptPrivacy !== true) {
          return errorResponse(
            "LEGAL_CONSENT_REQUIRED",
            "You must accept the Privacy Policy and Terms of Use to create a campus profile.",
            400,
            allowedOrigin,
            requestId
          );
        }

        // Check if student profile already exists for this Firebase UID
        const existing = await env.DB.prepare(
          "SELECT firebase_uid FROM students WHERE firebase_uid = ?"
        )
          .bind(uid)
          .first();
        if (existing) {
          return errorResponse(
            "PROFILE_ALREADY_EXISTS",
            "A student profile is already bound to this Google account.",
            409,
            allowedOrigin,
            requestId
          );
        }

        const nickname = sanitizePlainText(
          body.nickname || verifiedUser.name || "匿名摸鱼学子",
          36,
          "匿名摸鱼学子"
        );
        const collegeRaw = typeof body.college === "string" ? body.college : "retreat";
        const college: CollegeKey = (VALID_COLLEGES as readonly string[]).includes(collegeRaw)
          ? (collegeRaw as CollegeKey)
          : "retreat";

        const majorIdx =
          typeof body.majorIdx === "number" &&
          Number.isInteger(body.majorIdx) &&
          body.majorIdx >= 0 &&
          body.majorIdx < MAJOR_OPTIONS.zh.length
            ? body.majorIdx
            : 0;
        const majorText = sanitizePlainText(
          typeof body.major === "string" && body.major.trim()
            ? body.major
            : MAJOR_OPTIONS.zh[majorIdx],
          80,
          MAJOR_OPTIONS.zh[0]
        );

        const honorIdx =
          typeof body.honorIdx === "number" &&
          Number.isInteger(body.honorIdx) &&
          body.honorIdx >= 0 &&
          body.honorIdx < HONOR_TITLES.zh.length
            ? body.honorIdx
            : 0;
        const fictionalHonor = sanitizePlainText(
          typeof body.fictionalHonor === "string" && body.fictionalHonor.trim()
            ? body.fictionalHonor
            : HONOR_TITLES.zh[honorIdx],
          120,
          HONOR_TITLES.zh[0]
        );

        const enrollmentYear =
          typeof body.enrollmentYear === "number" &&
          Number.isInteger(body.enrollmentYear) &&
          body.enrollmentYear >= 1899 &&
          body.enrollmentYear <= 2030
            ? body.enrollmentYear
            : 2026;

        const nowIso = new Date().toISOString();
        const enrollmentDate = nowIso.slice(0, 10);
        const avatarSeed = sanitizeAvatarSeed(body.avatarSeed);
        const avatarUrl =
          body.useGoogleAvatar === true ? sanitizeAvatarUrl(verifiedUser.picture) : "";

        // Visibility defaults strictly to 'private'. Public requires explicit separate consent.
        const wantsPublic = body.visibility === "public" && body.publicConsent === true;
        const visibility = wantsPublic ? "public" : "private";
        const publicConsent = wantsPublic ? 1 : 0;
        const publicConsentAt = wantsPublic ? nowIso : null;

        // Generate unique ANU student number with collision retry
        let studentNumber = generateStudentNumber(enrollmentYear);
        let inserted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          studentNumber = generateStudentNumber(enrollmentYear);
          try {
            await env.DB.prepare(
              `INSERT INTO students (
                firebase_uid, student_number, nickname, avatar_seed, avatar_url,
                college, major, enrollment_year, enrollment_date, fictional_honor,
                visibility, public_consent, public_consent_at,
                terms_accepted_at, privacy_accepted_at, idle_seconds, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
            )
              .bind(
                uid,
                studentNumber,
                nickname,
                avatarSeed,
                avatarUrl,
                college,
                majorText,
                enrollmentYear,
                enrollmentDate,
                fictionalHonor,
                visibility,
                publicConsent,
                publicConsentAt,
                nowIso,
                nowIso,
                nowIso,
                nowIso
              )
              .run();
            inserted = true;
            break;
          } catch (err) {
            const msg = String(err);
            if (msg.includes("students.firebase_uid")) {
              return errorResponse(
                "PROFILE_ALREADY_EXISTS",
                "A student profile is already bound to this Google account.",
                409,
                allowedOrigin,
                requestId
              );
            }
          }
        }

        if (!inserted) {
          return errorResponse(
            "REGISTRATION_CONFLICT",
            "Could not allocate a unique student number. Please retry.",
            500,
            allowedOrigin,
            requestId
          );
        }

        // Grant matriculation badge
        await grantBadgeIfAbsent(env, uid, "milestone_enrolled");
        await recordAuditLog(env, "STUDENT_REGISTERED", await sha256Hex(uid), ipHash, {
          studentNumber
        });

        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse({ ok: true, data: bundle }, 201, allowedOrigin, requestId);
      }

      // Ensure student profile exists for all subsequent /api/v1/me/* routes
      const currentStudent = await env.DB.prepare(
        "SELECT * FROM students WHERE firebase_uid = ?"
      )
        .bind(uid)
        .first<StudentRecord>();

      if (!currentStudent) {
        return errorResponse(
          "PROFILE_NOT_REGISTERED",
          "Please complete your ANU student profile registration first.",
          404,
          allowedOrigin,
          requestId
        );
      }

      // 10. PATCH /api/v1/me/profile - Update Student Profile & Privacy Visibility
      if (method === "PATCH" && path === "/api/v1/me/profile") {
        const nickname =
          body.nickname !== undefined
            ? sanitizePlainText(body.nickname, 36, currentStudent.nickname)
            : currentStudent.nickname;

        const college: CollegeKey =
          typeof body.college === "string" &&
          (VALID_COLLEGES as readonly string[]).includes(body.college)
            ? (body.college as CollegeKey)
            : currentStudent.college;

        const major =
          body.major !== undefined
            ? sanitizePlainText(body.major, 80, currentStudent.major)
            : currentStudent.major;

        const fictionalHonor =
          body.fictionalHonor !== undefined
            ? sanitizePlainText(body.fictionalHonor, 120, currentStudent.fictional_honor)
            : currentStudent.fictional_honor;

        const avatarSeed =
          body.avatarSeed !== undefined
            ? sanitizeAvatarSeed(body.avatarSeed)
            : currentStudent.avatar_seed;

        let avatarUrl = currentStudent.avatar_url;
        if (body.useGoogleAvatar === true) {
          avatarUrl = sanitizeAvatarUrl(verifiedUser.picture);
        } else if (body.useGoogleAvatar === false) {
          avatarUrl = "";
        }

        let visibility = currentStudent.visibility;
        let publicConsent = currentStudent.public_consent;
        let publicConsentAt = currentStudent.public_consent_at;
        const nowIso = new Date().toISOString();

        if (body.visibility === "private") {
          visibility = "private";
          publicConsent = 0;
          publicConsentAt = null;
        } else if (body.visibility === "public") {
          if (body.publicConsent !== true) {
            return errorResponse(
              "PUBLIC_CONSENT_REQUIRED",
              "Explicit consent is required to make your campus profile public.",
              400,
              allowedOrigin,
              requestId
            );
          }
          visibility = "public";
          publicConsent = 1;
          publicConsentAt = publicConsentAt || nowIso;
        }

        let idleSeconds = currentStudent.idle_seconds;
        if (typeof body.addIdleSeconds === "number" && Number.isInteger(body.addIdleSeconds)) {
          const delta = Math.max(0, Math.min(20000, body.addIdleSeconds));
          idleSeconds = Math.min(999999999, currentStudent.idle_seconds + delta);
        }

        await env.DB.prepare(
          `UPDATE students
           SET nickname = ?, avatar_seed = ?, avatar_url = ?, college = ?, major = ?,
               fictional_honor = ?, visibility = ?, public_consent = ?, public_consent_at = ?,
               idle_seconds = ?, updated_at = ?
           WHERE firebase_uid = ?`
        )
          .bind(
            nickname,
            avatarSeed,
            avatarUrl,
            college,
            major,
            fictionalHonor,
            visibility,
            publicConsent,
            publicConsentAt,
            idleSeconds,
            nowIso,
            uid
          )
          .run();

        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse({ ok: true, data: bundle }, 200, allowedOrigin, requestId);
      }

      // 11. POST /api/v1/me/exams - Server-side Mock Exam Grading & Transcript Sync
      if (method === "POST" && path === "/api/v1/me/exams") {
        const courseCode = typeof body.courseCode === "string" ? body.courseCode.trim() : "";
        const graded = gradeCourseExamServerSide(courseCode, body.answers);
        if (!graded) {
          return errorResponse(
            "INVALID_EXAM_SUBMISSION",
            "Invalid course code or exam answer payload.",
            400,
            allowedOrigin,
            requestId
          );
        }

        const spec = COURSE_EXAMS[courseCode];
        const dedupeHash = await sha256Hex(
          `${uid}:exam:${courseCode}:${graded.normalizedAnswers.join(",")}`
        );

        const existingExam = await env.DB.prepare(
          "SELECT id FROM transcripts WHERE firebase_uid = ? AND dedupe_hash = ?"
        )
          .bind(uid, dedupeHash)
          .first<{ id: string }>();

        if (!existingExam) {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO transcripts (
              id, firebase_uid, course_code, course_title_zh, course_title_en,
              score, grade, grade_label_zh, grade_label_en, verdict_zh, verdict_en,
              answers_json, dedupe_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              generateId(),
              uid,
              courseCode,
              spec.titleZh,
              spec.titleEn,
              graded.score,
              graded.grade,
              graded.gradeLabelZh,
              graded.gradeLabelEn,
              graded.verdictZh,
              graded.verdictEn,
              JSON.stringify(graded.normalizedAnswers),
              dedupeHash
            )
            .run();
        }

        await grantBadgeIfAbsent(env, uid, "milestone_first_exam");
        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse(
          {
            ok: true,
            graded: {
              courseCode,
              score: graded.score,
              grade: graded.grade,
              gradeLabelZh: graded.gradeLabelZh,
              gradeLabelEn: graded.gradeLabelEn,
              verdictZh: graded.verdictZh,
              verdictEn: graded.verdictEn
            },
            data: bundle
          },
          201,
          allowedOrigin,
          requestId
        );
      }

      // 12. POST /api/v1/me/papers - Save Zero-Word Paper to Student Archive
      if (method === "POST" && path === "/api/v1/me/papers") {
        const paperEnabled = await isFeatureEnabled(env, "paper_submission_enabled");
        if (!paperEnabled) {
          return errorResponse(
            "PAPER_SUBMISSION_PAUSED",
            "Zero-word manuscript submissions are temporarily paused by the Editorial Board.",
            503,
            allowedOrigin,
            requestId
          );
        }

        const turnstileToken =
          request.headers.get("X-Turnstile-Token") ||
          (typeof body.turnstileToken === "string" ? body.turnstileToken : "");
        const turnstileOk = await verifyTurnstileToken(env, turnstileToken, clientIp);
        if (!turnstileOk) {
          return errorResponse(
            "TURNSTILE_VERIFICATION_FAILED",
            "Human verification (Cloudflare Turnstile) is required for manuscript submission.",
            403,
            allowedOrigin,
            requestId
          );
        }

        const title = sanitizePlainText(body.title, 100, "");
        if (!title) {
          return errorResponse("INVALID_PAPER_TITLE", "Paper title is required.", 400, allowedOrigin, requestId);
        }

        const authorDisplay = sanitizePlainText(
          body.author || currentStudent.nickname,
          50,
          currentStudent.nickname
        );

        const journalIdx =
          typeof body.journalIdx === "number" &&
          Number.isInteger(body.journalIdx) &&
          body.journalIdx >= 0 &&
          body.journalIdx < JOURNAL_OPTIONS.zh.length
            ? body.journalIdx
            : 0;

        const methodologyIdx =
          typeof body.methodologyIdx === "number" &&
          Number.isInteger(body.methodologyIdx) &&
          body.methodologyIdx >= 0 &&
          body.methodologyIdx < METHODOLOGY_OPTIONS.zh.length
            ? body.methodologyIdx
            : 0;

        const dedupeHash = await sha256Hex(
          `${uid}:paper:${title.toLowerCase()}:${journalIdx}:${methodologyIdx}`
        );

        const existingPaper = await env.DB.prepare(
          "SELECT void_id FROM papers WHERE firebase_uid = ? AND dedupe_hash = ?"
        )
          .bind(uid, dedupeHash)
          .first<{ void_id: string }>();

        if (existingPaper) {
          const bundle = await fetchFullStudentBundle(env, uid);
          return jsonResponse(
            { ok: true, deduplicated: true, voidId: existingPaper.void_id, data: bundle },
            200,
            allowedOrigin,
            requestId
          );
        }

        const randSuffix = Math.floor(100000 + Math.random() * 899999);
        const voidId = `VOID-ID: ANU.NULL.2026.${randSuffix}`;
        const reviewIdx = (journalIdx + methodologyIdx) % PEER_REVIEW_POOL.zh.length;
        const citIdx = journalIdx % CITATIONS_POOL.zh.length;

        await env.DB.prepare(
          `INSERT INTO papers (
            id, firebase_uid, void_id, title, author_display,
            journal_idx, journal_zh, journal_en, methodology_idx,
            content_zh, content_en, footnote_zh, footnote_en,
            reviewer_header_zh, reviewer_header_en, review_zh, review_en,
            citations_zh, citations_en, dedupe_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(firebase_uid, dedupe_hash) DO NOTHING`
        )
          .bind(
            generateId(),
            uid,
            voidId,
            title,
            authorDisplay,
            journalIdx,
            JOURNAL_OPTIONS.zh[journalIdx],
            JOURNAL_OPTIONS.en[journalIdx],
            methodologyIdx,
            METHODOLOGY_OPTIONS.zh[methodologyIdx].content,
            METHODOLOGY_OPTIONS.en[methodologyIdx].content,
            METHODOLOGY_OPTIONS.zh[methodologyIdx].footnote,
            METHODOLOGY_OPTIONS.en[methodologyIdx].footnote,
            PEER_REVIEW_POOL.zh[reviewIdx].header,
            PEER_REVIEW_POOL.en[reviewIdx].header,
            PEER_REVIEW_POOL.zh[reviewIdx].text,
            PEER_REVIEW_POOL.en[reviewIdx].text,
            CITATIONS_POOL.zh[citIdx],
            CITATIONS_POOL.en[citIdx],
            dedupeHash
          )
          .run();

        await grantBadgeIfAbsent(env, uid, "milestone_first_paper");
        const savedPaper = await env.DB.prepare(
          "SELECT void_id FROM papers WHERE firebase_uid = ? AND dedupe_hash = ?"
        ).bind(uid, dedupeHash).first<{ void_id: string }>();
        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse({ ok: true, voidId: savedPaper?.void_id || voidId, data: bundle }, 201, allowedOrigin, requestId);
      }

      // 13. POST /api/v1/me/diplomas - Register Honorary Diploma in Student Archive
      if (method === "POST" && path === "/api/v1/me/diplomas") {
        const diplomaEnabled = await isFeatureEnabled(env, "diploma_registration_enabled");
        if (!diplomaEnabled) {
          return errorResponse(
            "DIPLOMA_REGISTRATION_PAUSED",
            "Honorary diploma registration is temporarily paused by the Chancellor's Office.",
            503,
            allowedOrigin,
            requestId
          );
        }

        const turnstileToken =
          request.headers.get("X-Turnstile-Token") ||
          (typeof body.turnstileToken === "string" ? body.turnstileToken : "");
        const turnstileOk = await verifyTurnstileToken(env, turnstileToken, clientIp);
        if (!turnstileOk) {
          return errorResponse(
            "TURNSTILE_VERIFICATION_FAILED",
            "Human verification (Cloudflare Turnstile) is required for diploma registration.",
            403,
            allowedOrigin,
            requestId
          );
        }

        const recipientName = sanitizePlainText(
          body.recipientName || currentStudent.nickname,
          40,
          currentStudent.nickname
        );
        const degreeIdx =
          typeof body.degreeIdx === "number" &&
          Number.isInteger(body.degreeIdx) &&
          body.degreeIdx >= 0 &&
          body.degreeIdx < DEGREE_OPTIONS.zh.length
            ? body.degreeIdx
            : 0;
        const majorIdx =
          typeof body.majorIdx === "number" &&
          Number.isInteger(body.majorIdx) &&
          body.majorIdx >= 0 &&
          body.majorIdx < MAJOR_OPTIONS.zh.length
            ? body.majorIdx
            : 0;
        const honorIdx =
          typeof body.honorIdx === "number" &&
          Number.isInteger(body.honorIdx) &&
          body.honorIdx >= 0 &&
          body.honorIdx < HONOR_TITLES.zh.length
            ? body.honorIdx
            : 0;
        const citationIdx =
          typeof body.citationIdx === "number" &&
          Number.isInteger(body.citationIdx) &&
          body.citationIdx >= 0 &&
          body.citationIdx <= 10
            ? body.citationIdx
            : 0;
        const templateId =
          typeof body.templateId === "string" &&
          ["oxford", "parchment", "minimal"].includes(body.templateId)
            ? body.templateId
            : "oxford";
        const certLang =
          typeof body.certLang === "string" &&
          ["auto", "zh", "en", "bilingual"].includes(body.certLang)
            ? body.certLang
            : "auto";

        const dedupeHash = await sha256Hex(
          `${uid}:diploma:${recipientName.toLowerCase()}:${degreeIdx}:${majorIdx}:${honorIdx}:${templateId}`
        );

        const existingDip = await env.DB.prepare(
          "SELECT serial_number FROM diplomas WHERE firebase_uid = ? AND dedupe_hash = ?"
        )
          .bind(uid, dedupeHash)
          .first<{ serial_number: string }>();

        if (existingDip) {
          const bundle = await fetchFullStudentBundle(env, uid);
          return jsonResponse(
            {
              ok: true,
              deduplicated: true,
              serialNumber: existingDip.serial_number,
              data: bundle
            },
            200,
            allowedOrigin,
            requestId
          );
        }

        const randSerial = Math.floor(100000 + Math.random() * 899999);
        const serialNumber = `ANU-2026-VOID-${randSerial}`;
        const issuedDate = new Date().toISOString().slice(0, 10);

        await env.DB.prepare(
          `INSERT INTO diplomas (
            id, firebase_uid, serial_number, recipient_name,
            degree_idx, degree_zh, degree_en,
            major_idx, major_zh, major_en,
            honor_idx, honor_zh, honor_en,
            citation_idx, template_id, cert_lang, is_stamped, issued_date, dedupe_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(firebase_uid, dedupe_hash) DO NOTHING`
        )
          .bind(
            generateId(),
            uid,
            serialNumber,
            recipientName,
            degreeIdx,
            DEGREE_OPTIONS.zh[degreeIdx],
            DEGREE_OPTIONS.en[degreeIdx],
            majorIdx,
            MAJOR_OPTIONS.zh[majorIdx],
            MAJOR_OPTIONS.en[majorIdx],
            honorIdx,
            HONOR_TITLES.zh[honorIdx],
            HONOR_TITLES.en[honorIdx],
            citationIdx,
            templateId,
            certLang,
            issuedDate,
            dedupeHash
          )
          .run();

        await grantBadgeIfAbsent(env, uid, "milestone_first_diploma");
        const savedDiploma = await env.DB.prepare(
          "SELECT serial_number FROM diplomas WHERE firebase_uid = ? AND dedupe_hash = ?"
        ).bind(uid, dedupeHash).first<{ serial_number: string }>();
        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse({ ok: true, serialNumber: savedDiploma?.serial_number || serialNumber, data: bundle }, 201, allowedOrigin, requestId);
      }

      // 14. POST /api/v1/me/honors - Sync Club Memberships & Easter Egg Achievements
      if (method === "POST" && path === "/api/v1/me/honors") {
        const action = body.action === "remove" ? "remove" : "add";
        const badgeKey = typeof body.badgeKey === "string" ? body.badgeKey.trim() : "";
        const spec = OFFICIAL_BADGES[badgeKey];
        if (!spec) {
          return errorResponse(
            "INVALID_BADGE_KEY",
            "Unrecognized honor or club badge identifier.",
            400,
            allowedOrigin,
            requestId
          );
        }

        if (action === "remove" && spec.category === "club") {
          await env.DB.prepare(
            "DELETE FROM honors_achievements WHERE firebase_uid = ? AND badge_key = ?"
          )
            .bind(uid, badgeKey)
            .run();
        } else {
          await grantBadgeIfAbsent(env, uid, badgeKey);
        }

        const bundle = await fetchFullStudentBundle(env, uid);
        return jsonResponse({ ok: true, data: bundle }, 200, allowedOrigin, requestId);
      }

      // 15. POST /api/v1/me/import - Idempotent Local Campus Archive Import
      if (method === "POST" && path === "/api/v1/me/import") {
        const idemKey =
          request.headers.get("X-Idempotency-Key") ||
          (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "");

        if (!idemKey || idemKey.length < 8 || idemKey.length > 128) {
          return errorResponse(
            "IDEMPOTENCY_KEY_REQUIRED",
            "A valid X-Idempotency-Key header is required for local archive import.",
            400,
            allowedOrigin,
            requestId
          );
        }

        // Check idempotency ledger to avoid duplicate imports or concurrent replay
        const priorImport = await env.DB.prepare(
          "SELECT status_code, response_json FROM idempotency_keys WHERE firebase_uid = ? AND idem_key = ? AND endpoint = 'import'"
        )
          .bind(uid, idemKey)
          .first<{ status_code: number; response_json: string }>();

        if (priorImport) {
          return jsonResponse(
            JSON.parse(priorImport.response_json),
            priorImport.status_code,
            allowedOrigin,
            requestId
          );
        }

        // Successful replays above must not consume a second single-use challenge.
        // Every new import requires the same human verification as direct submissions.
        const turnstileToken =
          request.headers.get("X-Turnstile-Token") ||
          (typeof body.turnstileToken === "string" ? body.turnstileToken : "");
        if (!(await verifyTurnstileToken(env, turnstileToken, clientIp))) {
          return errorResponse(
            "TURNSTILE_VERIFICATION_FAILED",
            "Human verification (Cloudflare Turnstile) is required for archive import.",
            403,
            allowedOrigin,
            requestId
          );
        }

        if (Array.isArray(body.papers) && body.papers.length > 0 &&
            !(await isFeatureEnabled(env, "paper_submission_enabled"))) {
          return errorResponse(
            "PAPER_SUBMISSION_PAUSED",
            "Zero-word manuscript submissions are temporarily paused by the Editorial Board.",
            503,
            allowedOrigin,
            requestId
          );
        }
        if (Array.isArray(body.diplomas) && body.diplomas.length > 0 &&
            !(await isFeatureEnabled(env, "diploma_registration_enabled"))) {
          return errorResponse(
            "DIPLOMA_REGISTRATION_PAUSED",
            "Honorary diploma registration is temporarily paused by the Chancellor's Office.",
            503,
            allowedOrigin,
            requestId
          );
        }

        // Prepare all candidate records before any mutation. A full archive or a
        // paused subsystem must reject the whole request without partial writes.
        const examWrites = new Map<string, D1PreparedStatement>();
        const paperWrites = new Map<string, D1PreparedStatement>();
        const diplomaWrites = new Map<string, D1PreparedStatement>();

        // 15a. Validate and server-grade imported exams
        if (Array.isArray(body.exams)) {
          for (const ex of body.exams) {
            if (!ex || typeof ex !== "object") continue;
            const rec = ex as Record<string, unknown>;
            const cCode = typeof rec.courseCode === "string" ? rec.courseCode : "";
            const graded = gradeCourseExamServerSide(cCode, rec.answers);
            if (!graded) continue;
            const spec = COURSE_EXAMS[cCode];
            const dedupeHash = await sha256Hex(
              `${uid}:exam:${cCode}:${graded.normalizedAnswers.join(",")}`
            );
            const statement = env.DB.prepare(
              `INSERT OR IGNORE INTO transcripts (
                id, firebase_uid, course_code, course_title_zh, course_title_en,
                score, grade, grade_label_zh, grade_label_en, verdict_zh, verdict_en,
                answers_json, dedupe_hash
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                generateId(),
                uid,
                cCode,
                spec.titleZh,
                spec.titleEn,
                graded.score,
                graded.grade,
                graded.gradeLabelZh,
                graded.gradeLabelEn,
                graded.verdictZh,
                graded.verdictEn,
                JSON.stringify(graded.normalizedAnswers),
                dedupeHash
              );
            examWrites.set(dedupeHash, statement);
          }
        }

        // 15b. Validate local papers
        if (Array.isArray(body.papers)) {
          for (const p of body.papers) {
            if (!p || typeof p !== "object") continue;
            const rec = p as Record<string, unknown>;
            const title = sanitizePlainText(rec.title, 100, "");
            if (!title) continue;
            const authorDisplay = sanitizePlainText(
              rec.author || currentStudent.nickname,
              50,
              currentStudent.nickname
            );
            const jIdx =
              typeof rec.journalIdx === "number" &&
              Number.isInteger(rec.journalIdx) &&
              rec.journalIdx >= 0 &&
              rec.journalIdx < JOURNAL_OPTIONS.zh.length
                ? rec.journalIdx
                : 0;
            const mIdx =
              typeof rec.methodologyIdx === "number" &&
              Number.isInteger(rec.methodologyIdx) &&
              rec.methodologyIdx >= 0 &&
              rec.methodologyIdx < METHODOLOGY_OPTIONS.zh.length
                ? rec.methodologyIdx
                : 0;

            const dedupeHash = await sha256Hex(
              `${uid}:paper:${title.toLowerCase()}:${jIdx}:${mIdx}`
            );
            const randSuffix = Math.floor(100000 + Math.random() * 899999);
            const voidId = `VOID-ID: ANU.NULL.2026.${randSuffix}`;
            const reviewIdx = (jIdx + mIdx) % PEER_REVIEW_POOL.zh.length;
            const citIdx = jIdx % CITATIONS_POOL.zh.length;

            const statement = env.DB.prepare(
              `INSERT OR IGNORE INTO papers (
                id, firebase_uid, void_id, title, author_display,
                journal_idx, journal_zh, journal_en, methodology_idx,
                content_zh, content_en, footnote_zh, footnote_en,
                reviewer_header_zh, reviewer_header_en, review_zh, review_en,
                citations_zh, citations_en, dedupe_hash
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                generateId(),
                uid,
                voidId,
                title,
                authorDisplay,
                jIdx,
                JOURNAL_OPTIONS.zh[jIdx],
                JOURNAL_OPTIONS.en[jIdx],
                mIdx,
                METHODOLOGY_OPTIONS.zh[mIdx].content,
                METHODOLOGY_OPTIONS.en[mIdx].content,
                METHODOLOGY_OPTIONS.zh[mIdx].footnote,
                METHODOLOGY_OPTIONS.en[mIdx].footnote,
                PEER_REVIEW_POOL.zh[reviewIdx].header,
                PEER_REVIEW_POOL.en[reviewIdx].header,
                PEER_REVIEW_POOL.zh[reviewIdx].text,
                PEER_REVIEW_POOL.en[reviewIdx].text,
                CITATIONS_POOL.zh[citIdx],
                CITATIONS_POOL.en[citIdx],
                dedupeHash
              );
            paperWrites.set(dedupeHash, statement);
          }
        }

        // 15c. Validate local diplomas
        if (Array.isArray(body.diplomas)) {
          for (const d of body.diplomas) {
            if (!d || typeof d !== "object") continue;
            const rec = d as Record<string, unknown>;
            const recipientName = sanitizePlainText(
              rec.recipientName || currentStudent.nickname,
              40,
              currentStudent.nickname
            );
            const degreeIdx =
              typeof rec.degreeIdx === "number" &&
              Number.isInteger(rec.degreeIdx) &&
              rec.degreeIdx >= 0 &&
              rec.degreeIdx < DEGREE_OPTIONS.zh.length
                ? rec.degreeIdx
                : 0;
            const majorIdx =
              typeof rec.majorIdx === "number" &&
              Number.isInteger(rec.majorIdx) &&
              rec.majorIdx >= 0 &&
              rec.majorIdx < MAJOR_OPTIONS.zh.length
                ? rec.majorIdx
                : 0;
            const honorIdx =
              typeof rec.honorIdx === "number" &&
              Number.isInteger(rec.honorIdx) &&
              rec.honorIdx >= 0 &&
              rec.honorIdx < HONOR_TITLES.zh.length
                ? rec.honorIdx
                : 0;
            const citationIdx =
              typeof rec.citationIdx === "number" &&
              Number.isInteger(rec.citationIdx) &&
              rec.citationIdx >= 0 &&
              rec.citationIdx <= 10
                ? rec.citationIdx
                : 0;
            const templateId =
              typeof rec.templateId === "string" &&
              ["oxford", "parchment", "minimal"].includes(rec.templateId)
                ? rec.templateId
                : "oxford";
            const certLang =
              typeof rec.certLang === "string" &&
              ["auto", "zh", "en", "bilingual"].includes(rec.certLang)
                ? rec.certLang
                : "auto";

            const dedupeHash = await sha256Hex(
              `${uid}:diploma:${recipientName.toLowerCase()}:${degreeIdx}:${majorIdx}:${honorIdx}:${templateId}`
            );
            const randSerial = Math.floor(100000 + Math.random() * 899999);
            const serialNumber = `ANU-2026-VOID-${randSerial}`;
            const issuedDate = new Date().toISOString().slice(0, 10);

            const statement = env.DB.prepare(
              `INSERT OR IGNORE INTO diplomas (
                id, firebase_uid, serial_number, recipient_name,
                degree_idx, degree_zh, degree_en,
                major_idx, major_zh, major_en,
                honor_idx, honor_zh, honor_en,
                citation_idx, template_id, cert_lang, is_stamped, issued_date, dedupe_hash
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
            )
              .bind(
                generateId(),
                uid,
                serialNumber,
                recipientName,
                degreeIdx,
                DEGREE_OPTIONS.zh[degreeIdx],
                DEGREE_OPTIONS.en[degreeIdx],
                majorIdx,
                MAJOR_OPTIONS.zh[majorIdx],
                MAJOR_OPTIONS.en[majorIdx],
                honorIdx,
                HONOR_TITLES.zh[honorIdx],
                HONOR_TITLES.en[honorIdx],
                citationIdx,
                templateId,
                certLang,
                issuedDate,
                dedupeHash
              );
            diplomaWrites.set(dedupeHash, statement);
          }
        }

        const archiveChecks = [
          { table: "transcripts", writes: examWrites, limit: MAX_EXAMS_PER_STUDENT,
            code: "TRANSCRIPT_LIMIT_REACHED", message: "Maximum saved exam transcripts limit reached." },
          { table: "papers", writes: paperWrites, limit: MAX_PAPERS_PER_STUDENT,
            code: "PAPER_LIMIT_REACHED", message: "Maximum archived papers limit (30) reached for this student account." },
          { table: "diplomas", writes: diplomaWrites, limit: MAX_DIPLOMAS_PER_STUDENT,
            code: "DIPLOMA_LIMIT_REACHED", message: "Maximum archived diplomas limit (20) reached for this student account." }
        ] as const;
        for (const check of archiveChecks) {
          if (check.writes.size === 0) continue;
          // Table names come only from the fixed list above; UID remains bound.
          const existing = await env.DB.prepare(
            `SELECT dedupe_hash FROM ${check.table} WHERE firebase_uid = ?`
          ).bind(uid).all<{ dedupe_hash: string }>();
          const existingHashes = new Set(existing.results.map((row) => row.dedupe_hash));
          for (const hash of existingHashes) check.writes.delete(hash);
          if (check.writes.size > 0 && existingHashes.size + check.writes.size > check.limit) {
            return errorResponse(check.code, check.message, 429, allowedOrigin, requestId);
          }
        }

        const writes = [...examWrites.values(), ...paperWrites.values(), ...diplomaWrites.values()];
        const results = writes.length
          ? await env.DB.batch<{ meta?: { changes?: number } }>(writes)
          : [];
        const countChanges = (start: number, count: number) => results
          .slice(start, start + count)
          .reduce((sum, result) => sum + (result.meta?.changes || 0), 0);
        const importedExams = countChanges(0, examWrites.size);
        const importedPapers = countChanges(examWrites.size, paperWrites.size);
        const importedDiplomas = countChanges(examWrites.size + paperWrites.size, diplomaWrites.size);

        let importedClubs = 0;
        if (Array.isArray(body.badges)) {
          for (const rawKey of body.badges) {
            if (typeof rawKey === "string" && OFFICIAL_BADGES[rawKey]) {
              if (await grantBadgeIfAbsent(env, uid, rawKey)) importedClubs++;
            }
          }
        }
        if (importedExams > 0) await grantBadgeIfAbsent(env, uid, "milestone_first_exam");
        if (importedPapers > 0) await grantBadgeIfAbsent(env, uid, "milestone_first_paper");
        if (importedDiplomas > 0) await grantBadgeIfAbsent(env, uid, "milestone_first_diploma");

        const bundle = await fetchFullStudentBundle(env, uid);
        const responsePayload = {
          ok: true,
          importedSummary: {
            clubsAndBadges: importedClubs,
            exams: importedExams,
            papers: importedPapers,
            diplomas: importedDiplomas
          },
          data: bundle
        };

        await env.DB.prepare(
          `INSERT OR IGNORE INTO idempotency_keys
            (idem_key, firebase_uid, endpoint, status_code, response_json, created_at)
           VALUES (?, ?, 'import', 200, ?, ?)`
        )
          .bind(idemKey, uid, JSON.stringify(responsePayload), Math.floor(Date.now() / 1000))
          .run();

        return jsonResponse(responsePayload, 200, allowedOrigin, requestId);
      }

      return errorResponse("NOT_FOUND", "Endpoint not found.", 404, allowedOrigin, requestId);
    } catch (err) {
      // D1 can wrap a trigger exception in Error.cause. Only our three explicit
      // quota sentinels become 429; all other SQL/internal details stay private.
      const quotaMessages = {
        TRANSCRIPT_LIMIT_REACHED: "Maximum saved exam transcripts limit reached.",
        PAPER_LIMIT_REACHED: "Maximum archived papers limit (30) reached for this student account.",
        DIPLOMA_LIMIT_REACHED: "Maximum archived diplomas limit (20) reached for this student account."
      } as const;
      let failure: unknown = err;
      for (let depth = 0; depth < 3 && failure instanceof Error; depth++) {
        const match = failure.message.match(/\bANU_(TRANSCRIPT_LIMIT_REACHED|PAPER_LIMIT_REACHED|DIPLOMA_LIMIT_REACHED)\b/);
        if (match) {
          const code = match[1] as keyof typeof quotaMessages;
          return errorResponse(code, quotaMessages[code], 429, allowedOrigin, requestId);
        }
        failure = failure.cause;
      }
      // Phase 2 requirement: Never leak credentials, SQL queries, or internal stack traces
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected server error occurred. No internal details were exposed.",
        500,
        allowedOrigin,
        requestId
      );
    }
  }
};
