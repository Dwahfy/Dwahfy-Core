const { Pool } = require('pg');

const { DATABASE_URL, PGSSLMODE, PGSSLREJECTUNAUTHORIZED } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const resolveSslConfig = (url) => {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get('sslmode') || PGSSLMODE;
    const rejectParam = parsed.searchParams.get('sslrejectunauthorized');
    const fallbackRejectParam =
      typeof PGSSLREJECTUNAUTHORIZED === 'string'
        ? PGSSLREJECTUNAUTHORIZED
        : null;
    const rejectUnauthorized =
      rejectParam === null
        ? fallbackRejectParam === null
          ? true
          : fallbackRejectParam.toLowerCase() !== 'false'
        : rejectParam.toLowerCase() !== 'false';
    if (!sslmode) return undefined;
    if (sslmode.toLowerCase() === 'disable') return undefined;
    if (sslmode.toLowerCase() === 'require') {
      return { rejectUnauthorized };
    }
    if (sslmode.toLowerCase() === 'verify-full') {
      return { rejectUnauthorized: true };
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
};

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: resolveSslConfig(DATABASE_URL),
});

const initDb = async () => {
  await pool.query('SELECT 1');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS identities (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id BIGSERIAL PRIMARY KEY,
      identity_id BIGINT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      bad_words_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      links JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS bad_words_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS badge_id BIGINT;
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_badge_id_fkey'
      ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_badge_id_fkey
        FOREIGN KEY (badge_id)
        REFERENCES badges(id)
        ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY,
      author_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      content_text TEXT NOT NULL,
      parent_post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_reactions (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (post_id, account_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_change_otps (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      new_email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS profiles_account_idx ON profiles(account_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS badges_slug_idx ON badges(slug);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS posts_parent_idx ON posts(parent_post_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS post_reactions_post_idx ON post_reactions(post_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS post_reactions_account_idx
      ON post_reactions(account_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS email_change_otps_account_idx
      ON email_change_otps(account_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_otps_account_idx
      ON password_reset_otps(account_id);
  `);
  console.log('Postgres connected');
};

const closeDb = async () => {
  await pool.end();
};

module.exports = {
  pool,
  initDb,
  closeDb,
};
