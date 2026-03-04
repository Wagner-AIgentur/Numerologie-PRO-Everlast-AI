import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.cyjxsgrtcllckgmqchwe:N%5EXEBo68xNrb67%24P%4026X@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const userId = 'f82eb144-3bee-41cf-9fad-41bc6e5eb933';

  // 1. Set profile: admin + demo_reviewer role
  const { rowCount } = await client.query(
    `UPDATE profiles
     SET crm_status = 'admin',
         team_role_id = '8ddb6af7-cf92-4074-bc92-45645b86869d',
         full_name = 'Demo Reviewer'
     WHERE id = $1::uuid`,
    [userId]
  );
  console.log('Profile updated:', rowCount, 'rows');

  // 2. Verify auth
  const { rows: auth } = await client.query(
    'SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users WHERE id = $1::uuid',
    [userId]
  );
  console.log('Auth:', JSON.stringify(auth, null, 2));

  // 3. Verify profile
  const { rows: profile } = await client.query(
    'SELECT id, email, full_name, crm_status, team_role_id FROM profiles WHERE id = $1::uuid',
    [userId]
  );
  console.log('Profile:', JSON.stringify(profile, null, 2));

  // 4. Verify identity
  const { rows: identity } = await client.query(
    'SELECT provider_id, provider, email FROM auth.identities WHERE user_id = $1::uuid',
    [userId]
  );
  console.log('Identity:', JSON.stringify(identity, null, 2));

  // 5. Verify role
  const { rows: role } = await client.query(
    `SELECT name, permissions FROM team_roles WHERE id = '8ddb6af7-cf92-4074-bc92-45645b86869d'`
  );
  console.log('Role:', JSON.stringify(role, null, 2));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
