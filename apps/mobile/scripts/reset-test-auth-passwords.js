const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.resolve(__dirname, "..");

function readEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .reduce((items, line) => {
      const index = line.indexOf("=");
      if (index === -1) return items;
      items[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      return items;
    }, {});
}

function requireValue(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

async function findUserByEmail(client, email) {
  let page = 1;

  while (page < 100) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }

  return null;
}

async function resetPassword(client, email, password) {
  const user = await findUserByEmail(client, email);
  if (!user) {
    const { error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: email.split("@")[0],
      },
    });

    if (error) throw new Error(`User creation failed for ${email}: ${error.message}`);
    console.log(`OK  test user created and e-mail confirmed for ${email}`);
    return;
  }

  const { error } = await client.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Password reset failed for ${email}: ${error.message}`);
  console.log(`OK  password reset and e-mail confirmed for ${email}`);
}

async function main() {
  const env = {
    ...readEnvFile(".env"),
    ...readEnvFile(".env.check.local"),
    ...readEnvFile(".env.admin.local"),
    ...process.env,
  };

  const supabaseUrl = requireValue(env, "EXPO_PUBLIC_SUPABASE_URL");
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.HOMELY_SUPABASE_SECRET_KEY;
  if (!secretKey?.trim()) {
    throw new Error("SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY or HOMELY_SUPABASE_SECRET_KEY is missing in apps/mobile/.env.admin.local");
  }

  const ownerEmail = requireValue(env, "HOMELY_OWNER_EMAIL");
  const ownerPassword = requireValue(env, "HOMELY_OWNER_PASSWORD");
  const secondEmail = requireValue(env, "HOMELY_SECOND_EMAIL");
  const secondPassword = requireValue(env, "HOMELY_SECOND_PASSWORD");

  const client = createClient(supabaseUrl, secretKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await resetPassword(client, ownerEmail, ownerPassword);
  await resetPassword(client, secondEmail, secondPassword);
}

main().catch((error) => {
  console.error(`ERR ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
