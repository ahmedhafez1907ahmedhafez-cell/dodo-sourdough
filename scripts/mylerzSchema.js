// ============================================================
// استخراج شكل البيانات المطلوبة من Swagger بتاع مايلرز
//   node scripts/mylerzSchema.js
//
// بينزّل الـ swagger (564 endpoint) ويطلّع منه:
//   1) بياناتك أنت (merchantId) من /api/Account/UserInfo
//   2) المخازن بتاعتك (نقاط الاستلام)
//   3) شكل الـ body المطلوب لإنشاء الشحنة بالظبط
// كله قراءة بس — مفيش أي شحنة بتتعمل.
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, DODO_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs"), path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const base = (env.MYLERZ_API_BASE_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");

// الـ endpoints اللي تهمنا
const WANTED = [
  "/api/pickupOrder/SaveIntegrationPickup",
  "/api/pickupOrder/CreateIntegrationMultiplePickups",
  "/api/package/SaveIntegrationPackages",
];

async function login() {
  const body = new URLSearchParams({
    grant_type: "password", username: env.MYLERZ_USERNAME || "", password: env.MYLERZ_PASSWORD || "",
  });
  const res = await fetch(`${base}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`login ${res.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t).access_token;
}

// بيفك الـ $ref ويطبع الحقول بشكل شجرة مقروءة
function describe(schema, defs, depth = 0, seen = new Set()) {
  const pad = "  ".repeat(depth + 1);
  if (!schema) return "";
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    if (seen.has(name) || depth > 3) return ` → ${name} (…)`;
    seen.add(name);
    const d = defs[name];
    if (!d) return ` → ${name}`;
    return ` → ${name}\n` + describe(d, defs, depth, seen);
  }
  if (schema.type === "array") return " [مصفوفة]" + describe(schema.items, defs, depth, seen);
  if (!schema.properties) return ` (${schema.type || "?"})`;
  const req = new Set(schema.required || []);
  let out = "";
  for (const [k, v] of Object.entries(schema.properties)) {
    const mark = req.has(k) ? "★" : " ";
    let t = v.type || (v.$ref ? "object" : "?");
    if (v.format) t += `/${v.format}`;
    out += `${pad}${mark} ${k.padEnd(28)} ${t}`;
    if (v.enum) out += `  = ${v.enum.join(" | ")}`;
    out += "\n";
    if (v.$ref || v.type === "array") out += pad + "   " + describe(v, defs, depth + 1, new Set(seen)).trim() + "\n";
  }
  return out;
}

(async () => {
  const token = await login();
  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  console.log("✅ تسجيل الدخول نجح\n");

  // ---- 1) مين أنا؟ ----
  console.log("═══ بياناتك على مايلرز ═══");
  for (const ep of ["/api/Account/UserInfo", "/api/Account/GetUserDetails"]) {
    const r = await fetch(base + ep, { headers: H });
    if (r.ok) {
      const txt = await r.text();
      console.log(`${ep}:`);
      console.log("  " + txt.slice(0, 700).replace(/\n/g, "\n  "));
      console.log("");
    }
  }

  // ---- 2) المخازن ----
  console.log("═══ المخازن / نقاط الاستلام ═══");
  const wr = await fetch(base + "/api/merchant/GetMerchantWarhouses", {
    method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "{}",
  });
  console.log(`POST /api/merchant/GetMerchantWarhouses → ${wr.status}`);
  console.log("  " + (await wr.text()).slice(0, 900).replace(/\n/g, "\n  "), "\n");

  // ---- 3) شكل الـ body لإنشاء الشحنة ----
  console.log("═══ شكل البيانات المطلوبة لإنشاء الشحنة ═══");
  const sw = await fetch(base + "/swagger/docs/v1", { headers: H });
  const doc = JSON.parse(await sw.text());
  const defs = doc.definitions || doc.components?.schemas || {};

  for (const p of WANTED) {
    const node = doc.paths?.[p];
    if (!node) { console.log(`\n${p} → مش موجود`); continue; }
    for (const [method, op] of Object.entries(node)) {
      console.log(`\n▶ ${method.toUpperCase()} ${p}`);
      if (op.summary) console.log(`  ${op.summary}`);
      for (const prm of op.parameters || []) {
        console.log(`  • parameter: ${prm.name} (in ${prm.in}${prm.required ? ", مطلوب" : ""})`);
        if (prm.schema) console.log(describe(prm.schema, defs).replace(/\n$/, ""));
      }
      if (!op.parameters?.length) console.log("  (مفيش parameters)");
    }
  }
  console.log("\n★ = حقل مطلوب");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
