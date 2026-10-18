/**
 * Public Runtime Configuration for ANU (https://freeze.edu.kg)
 *
 * Security Note:
 * - Firebase Web API keys and project IDs are public client identifiers by design;
 *   all data security is enforced server-side by the Cloudflare Worker JWT verifier,
 *   D1 ownership checks, CORS whitelist, and Turnstile verification.
 * - NEVER place Cloudflare API tokens, Turnstile secret keys, or ADMIN_API_TOKEN here.
 */
(function (global) {
  "use strict";

  global.ANU_CONFIG = global.ANU_CONFIG || {
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
})(window);
