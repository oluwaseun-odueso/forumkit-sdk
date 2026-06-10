/**
 * Development seed script.
 * Creates a sample forum, tags, users, threads, and posts for local testing.
 * Run: npm run seed --workspace=packages/db
 */
import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: process.env['DATABASE_URL'] });

async function seed(): Promise<void> {
  await client.connect();

  console.log('Seeding development database...');

  await client.query('BEGIN');

  try {
    // Forum
    const forumResult = await client.query<{ id: string }>(
      `INSERT INTO forums (name) VALUES ($1) RETURNING id`,
      ['ForumKit Dev Forum'],
    );
    const forumId = forumResult.rows[0]?.id;
    if (!forumId) throw new Error('Failed to create forum');

    // Tags
    const tags = [
      { name: 'General', color: '#6200EE' },
      { name: 'Bug Report', color: '#B00020' },
      { name: 'Feature Request', color: '#018786' },
      { name: 'Question', color: '#FF6D00' },
    ];
    const tagIds: string[] = [];
    for (const tag of tags) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO tags (forum_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
        [forumId, tag.name, tag.color],
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error(`Failed to create tag: ${tag.name}`);
      tagIds.push(id);
    }

    // Users
    const users = [
      { externalId: 'seed-user-1', displayName: 'Alice Dev', email: 'alice@example.com', role: 'admin' },
      { externalId: 'seed-user-2', displayName: 'Bob Engineer', email: 'bob@example.com', role: 'member' },
      { externalId: 'seed-user-3', displayName: 'Carol Tester', email: 'carol@example.com', role: 'member' },
    ];
    const userIds: string[] = [];
    for (const user of users) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (external_id, forum_id, display_name, email, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.externalId, forumId, user.displayName, user.email, user.role],
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error(`Failed to create user: ${user.displayName}`);
      userIds.push(id);
    }

    // Threads
    const threads = [
      {
        title: 'Welcome to ForumKit',
        body: 'This is the first thread in the ForumKit development forum. Feel free to explore the features.',
        tagIndex: 0,
      },
      {
        title: 'How do I configure the theming system?',
        body: 'I want to change the primary colour and font family. Where do I pass the theme tokens?',
        tagIndex: 3,
      },
      {
        title: 'Semantic search returns unexpected results',
        body: 'When I search for "authentication", I get threads about "login" which is correct, but also some unrelated results.',
        tagIndex: 1,
      },
    ];
    for (const [i, thread] of threads.entries()) {
      const authorId = userIds[i % userIds.length];
      if (!authorId) continue;
      const threadResult = await client.query<{ id: string }>(
        `INSERT INTO threads (forum_id, author_id, title, body)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [forumId, authorId, thread.title, thread.body],
      );
      const threadId = threadResult.rows[0]?.id;
      if (!threadId) continue;

      const tagId = tagIds[thread.tagIndex];
      if (tagId) {
        await client.query(
          `INSERT INTO thread_tags (thread_id, tag_id) VALUES ($1, $2)`,
          [threadId, tagId],
        );
      }

      // Add a reply to each thread
      const replyAuthorId = userIds[(i + 1) % userIds.length];
      if (replyAuthorId) {
        await client.query(
          `INSERT INTO posts (thread_id, author_id, body)
           VALUES ($1, $2, $3)`,
          [threadId, replyAuthorId, `Thanks for posting this! I have been wondering about this too.`],
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log(`  Forum ID: ${forumId}`);
    console.log(`  Created ${tags.length} tags, ${users.length} users, ${threads.length} threads`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

await seed();
