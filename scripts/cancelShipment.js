// ============================================================
// إلغاء شحنة من مايلرز
//   node scripts/cancelShipment.js 63779068341001
//   node scripts/cancelShipment.js 6377... 6377...   (أكتر من واحدة)
//   node scripts/cancelShipment.js --list            (يعرض الشحنات الأول)
// ============================================================

if (!process.execArgv.includes("--use-system-ca") && !process.env.DODO_CA_OK) {
  const { spawnSync } = require("child_process");
  const r = spawnSync(process.execPath, ["--use-system-ca", __filename, ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, DODO_CA_OK: "1" },
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

const fs = require("fs"), path = require("path");
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const BASE = (process.env.MYLERZ_API_BASE_URL || "https://integration.mylerz.net")
  .trim().replace(/\/+$/, "").replace(/\/api$/i, "");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const LIST = process.argv.includes("--list");

async function login() {
  const b = new URLSearchParams({
    grant_type: "password",
    username: process.env.MYLERZ_USERNAME,
    password: process.env.MYLERZ_PASSWORD,
  });
  const r = await fetch(`${BASE}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: b.toString(),
  });
  if (!r.ok) throw new Error("فشل تسجيل الدخول: " + r.status);
  return (await r.json()).access_token;
}

(async () => {
  const token = await login();
  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  console.log("✅ تسجيل الدخول نجح —", BASE, "\n");

  if (LIST || !args.length) {
    console.log("للإلغاء اكتب رقم التتبع بعد اسم السكريبت:");
    console.log("   node scripts/cancelShipment.js 63779068341001\n");
    console.log("لو مش فاكر الأرقام، تقدر تشوفها من:");
    console.log("   mylerz.net → Packages → تاب Uploaded\n");
    if (!args.length) return;
  }

  for (const bc of args) {
    process.stdout.write(`🗑️  ${bc} ... `);
    try {
      const r = await fetch(`${BASE}/api/packages/CancelPackage`, {
        method: "POST", headers: H,
        body: JSON.stringify([{ Barcode: String(bc), ReferenceNumber: "" }]),
      });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}

      const item = Array.isArray(j?.Value) ? j.Value[0] : j?.Value;
      if (j?.IsErrorState) {
        console.log("❌", j.ErrorDescription || "مرفوض");
      } else if (item?.IsChanged === false && item?.ErrorMessage) {
        console.log("❌", item.ErrorMessage);
      } else if (r.ok) {
        console.log("✅ اتلغت");
      } else {
        console.log(`❌ ${r.status} — ${t.slice(0, 140).replace(/\s+/g, " ")}`);
      }
    } catch (e) {
      console.log("❌", e.message);
    }
  }

  console.log("\nافتح mylerz.net → Packages وتأكد إنها اختفت.");
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
