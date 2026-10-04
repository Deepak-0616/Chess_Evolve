const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function confirmAllUsers() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  if (!users || !users.users || users.users.length === 0) {
    console.log('No users found.');
    return;
  }
  
  for (const user of users.users) {
    if (!user.email_confirmed_at) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      if (updateError) {
        console.error(`Error confirming ${user.email}:`, updateError);
      } else {
        console.log(`Successfully confirmed ${user.email}`);
      }
    } else {
      console.log(`${user.email} is already confirmed.`);
    }
  }
  console.log('Done confirming users.');
}

confirmAllUsers();
