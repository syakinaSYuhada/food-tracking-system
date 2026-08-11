const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/kak_norie_qdts' });
  try {
    await client.connect();
    const r1 = await client.query('SELECT current_database() AS db, current_schema() AS schema');
    console.log('DB_SCHEMA_RESULT::', JSON.stringify(r1.rows));
    const r2 = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'defects'");
    console.log('TABLE_LOOKUP_RESULT::', JSON.stringify(r2.rows));
    await client.end();
  } catch (e) {
    console.error('ERROR::', e.message);
    process.exit(1);
  }
})();
