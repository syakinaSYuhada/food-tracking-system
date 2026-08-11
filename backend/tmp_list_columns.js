const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/kak_norie_qdts' });
  try {
    await client.connect();
    const r = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='defects' ORDER BY ordinal_position");
    console.log(JSON.stringify(r.rows, null, 2));
    await client.end();
  } catch (e) { console.error(e.message); process.exit(1) }
})();
