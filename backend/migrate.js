const { Client } = require('pg');
const fs = require('fs');

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const sql = fs.readFileSync('migration.sql', 'utf8');
  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration successful!');
  await client.end();
};

run().catch(console.error);
