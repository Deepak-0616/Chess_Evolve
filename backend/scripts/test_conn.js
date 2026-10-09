import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function testConnections() {
  const directUrl = process.env.DIRECT_DATABASE_URL;
  const poolerUrl = process.env.DATABASE_URL;

  if (!directUrl && !poolerUrl) {
    console.error('Error: DIRECT_DATABASE_URL or DATABASE_URL must be configured in environment.');
    process.exit(1);
  }

  const urls = [];
  if (directUrl) urls.push({ name: 'Direct 5432', url: directUrl });
  if (poolerUrl) urls.push({ name: 'Pooler 6543', url: poolerUrl });

  for (const { name, url } of urls) {
    console.log(`Testing ${name}...`);
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const res = await client.query('SELECT NOW()');
      console.log(`  -> SUCCESS! DB time: ${res.rows[0].now}`);
      await client.end();
    } catch (e) {
      console.log(`  -> FAILED: ${e.message}`);
    }
  }
}

testConnections();
