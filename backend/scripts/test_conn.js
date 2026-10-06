import pg from 'pg';
const { Client } = pg;

async function testConnections() {
  const urls = [
    { name: 'Direct 5432', url: 'postgresql://postgres.jflaxfptqwnqxshzevqa:Chessdb123%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' },
    { name: 'Pooler 6543', url: 'postgresql://postgres.jflaxfptqwnqxshzevqa:Chessdb123%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' },
  ];

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
