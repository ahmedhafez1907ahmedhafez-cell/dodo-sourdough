const { adminDb } = require('../lib/firebaseAdmin');

(async () => {
  const snap = await adminDb.collection('products').get();
  snap.docs.forEach(d => {
    const p = d.data();
    console.log(`${p.nameAr} (${p.name}) - localOnly: ${p.localOnly}, catalog: ${p.catalog}`);
  });
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});