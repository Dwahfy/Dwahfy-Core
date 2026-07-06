/**
 * Seed script — creates fake users, posts, and replies for local testing.
 *
 * Usage:
 *   node scripts/create-fake-data.js
 *
 * All fake accounts use the password:  FakePass123!
 *
 * Safe to run multiple times — skips users/posts that already exist.
 */

const fs = require('fs');
require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Seed data ─────────────────────────────────────────────────────────────────

const FAKE_PASSWORD = 'FakePass123!';

const USERS = [
  { username: 'alex',    email: 'alex@example.com',    displayName: 'Alex Rivera',    bio: 'Coffee enthusiast and part-time philosopher.' },
  { username: 'maya',    email: 'maya@example.com',    displayName: 'Maya Chen',      bio: 'Building things on the internet. She/her.' },
  { username: 'jordan',  email: 'jordan@example.com',  displayName: 'Jordan Blake',   bio: 'Open source contributor. Loves dark mode.' },
  { username: 'priya',   email: 'priya@example.com',   displayName: 'Priya Nair',     bio: 'Designer by day, reader by night.' },
  { username: 'sam',     email: 'sam@example.com',     displayName: 'Sam Okafor',     bio: 'Just here to see what everyone is up to.' },
  { username: 'leo',     email: 'leo@example.com',     displayName: 'Leo Martínez',   bio: 'Music, code, and long walks.' },
  { username: 'nina',    email: 'nina@example.com',    displayName: 'Nina Kowalski',  bio: 'Asking questions nobody else wants to ask.' },
  { username: 'tom',     email: 'tom@example.com',     displayName: 'Tom Huang',      bio: 'Ship it. Fix it later.' },
];

const POSTS = [
  'Anyone else feel like mornings are just a myth?',
  'Hot take: tabs are fine, spaces are fine, just be consistent.',
  'Just deployed something and nothing broke. Going to bed before it does.',
  'The best documentation is the code you do not have to read.',
  'Reminder that "it works on my machine" is a valid first step.',
  'Three hours debugging a missing semicolon. Totally normal day.',
  'What is everyone reading lately? I need something new.',
  'Convinced that the best feature is the one you decide not to build.',
  'Finally cleaned up my bookmarks. Found articles from 2019. Still unread.',
  'Pair programming is just having someone watch you google things.',
  'Good UX is when users accomplish their goal without noticing the UI.',
  'Does anyone else name their variables as if they will be judged by future archaeologists?',
  'The longer the meeting, the shorter the outcome.',
  'A late night thought: every app is just a database with opinions.',
  'Write code for the person who will maintain it at 2am in a crisis.',
  'Unpopular opinion: a to-do app is a perfectly fine side project.',
  'Every codebase has that one file no one dares touch.',
  'The feature was easy. The edge cases were a novel.',
  'Sleep is the original code review.',
  'New to this platform. Say hi if you see this.',
];

const COMMENTS = [
  'This. Exactly this.',
  'Hard agree, could not have said it better.',
  'Counterpoint: what if it really does only work on your machine?',
  'I felt this post in my soul.',
  'Finally someone said it.',
  'I have been thinking about this all week.',
  'Wait, is this about me specifically?',
  'The tabs vs spaces debate will outlive us all.',
  'That last line hit different.',
  'Adding this to my list of things to think about at 3am.',
  'Bold claim, I respect it.',
  'The edge cases always get you.',
  'Honestly same.',
  'I showed this to my team and we all went quiet for a moment.',
  'This is why I like this platform.',
  'Classic.',
  'First!',
  'Say more.',
  'I need this on a poster.',
  'Screenshotting this.',
  'Not me nodding at every word.',
  'The 2am crisis part is so real.',
  'Variable naming is an art form, honestly.',
  'I once lost a day to a missing comma. No further questions.',
  'The best kind of feature request is a deletion request.',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickOther = (arr, exclude) => {
  const pool = arr.filter((x) => x !== exclude);
  return pick(pool);
};

// ── Main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const passwordHash = await bcrypt.hash(FAKE_PASSWORD, 10);

  // 1. Create users
  console.log('\nCreating fake users...');
  const accountIds = [];

  for (const user of USERS) {
    // Check if already exists
    const existing = await pool.query(
      'SELECT a.id FROM accounts a JOIN identities i ON i.id = a.identity_id WHERE a.username = $1',
      [user.username]
    );
    if (existing.rowCount > 0) {
      console.log(`  skip  ${user.username} (already exists)`);
      accountIds.push(existing.rows[0].id);
      continue;
    }

    // identities
    const identity = await pool.query(
      'INSERT INTO identities (email, email_verified) VALUES ($1, TRUE) RETURNING id',
      [user.email]
    );
    const identityId = identity.rows[0].id;

    // accounts
    const account = await pool.query(
      'INSERT INTO accounts (identity_id, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [identityId, user.username, passwordHash]
    );
    const accountId = account.rows[0].id;
    accountIds.push(accountId);

    // profiles
    await pool.query(
      'INSERT INTO profiles (account_id, display_name, bio) VALUES ($1, $2, $3)',
      [accountId, user.displayName, user.bio]
    );

    console.log(`  created ${user.username}`);
  }

  // 2. Create posts
  console.log('\nCreating fake posts...');
  const postIds = [];
  const shuffledPosts = [...POSTS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledPosts.length; i++) {
    const authorId = accountIds[i % accountIds.length];
    const content = shuffledPosts[i];

    // Check for duplicate content from same author
    const dupe = await pool.query(
      'SELECT id FROM posts WHERE author_id = $1 AND content_text = $2 AND parent_post_id IS NULL',
      [authorId, content]
    );
    if (dupe.rowCount > 0) {
      postIds.push(dupe.rows[0].id);
      continue;
    }

    const post = await pool.query(
      'INSERT INTO posts (author_id, content_text) VALUES ($1, $2) RETURNING id',
      [authorId, content]
    );
    postIds.push(post.rows[0].id);
  }
  console.log(`  ${postIds.length} posts ready`);

  // 3. Create comments (replies)
  console.log('\nCreating fake comments...');
  let commentCount = 0;
  const shuffledComments = [...COMMENTS].sort(() => Math.random() - 0.5);

  // Spread comments across posts — ~2-3 comments per post
  for (let i = 0; i < shuffledComments.length; i++) {
    const postId = postIds[i % postIds.length];

    // Fetch the post's author so the commenter can be someone else
    const postRow = await pool.query('SELECT author_id FROM posts WHERE id = $1', [postId]);
    const postAuthorId = postRow.rows[0].author_id;
    const commenterId = pickOther(accountIds, postAuthorId);

    const content = shuffledComments[i];

    const dupe = await pool.query(
      'SELECT id FROM posts WHERE author_id = $1 AND content_text = $2 AND parent_post_id = $3',
      [commenterId, content, postId]
    );
    if (dupe.rowCount > 0) continue;

    await pool.query(
      'INSERT INTO posts (author_id, content_text, parent_post_id) VALUES ($1, $2, $3)',
      [commenterId, content, postId]
    );
    commentCount++;
  }
  console.log(`  ${commentCount} comments created`);

  // 4. Summary
  console.log('\nDone.');
  console.log(`  Users:    ${accountIds.length}`);
  console.log(`  Posts:    ${postIds.length}`);
  console.log(`  Comments: ${commentCount}`);
  console.log(`\n  Login with any seed username (alex, maya, jordan…), password: ${FAKE_PASSWORD}\n`);
};

main()
  .catch((err) => {
    console.error('\nError:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
