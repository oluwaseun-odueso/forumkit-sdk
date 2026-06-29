ForumKit — Manual Backend Test Plan (Phases 3–9)

Branch: test/backend-manual
Any bug found gets fixed and committed here, then PR'd to main.

KEYS YOU NEED

Required (server won't start without these):
DATABASE_URL postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
FORUM_SECRET_KEY any string — must match the SECRET in gen-tokens.mjs

Optional (local fallbacks run if absent):
ANTHROPIC_API_KEY enables /ai/summarise and /ai/suggest — without it those return 503
OPENAI_API_KEY enables OpenAI embeddings/LLM — without it local models run
PERSPECTIVE_API_KEY enables Google Perspective moderation — without it toxic-bert runs
DATABASE_POOL_URL defaults to DATABASE_URL if absent, fine for testing

Recommended minimal .env:
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
FORUM_SECRET_KEY=your-secret-key-here
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
EMBEDDING_PROVIDER=local
MODERATION_PROVIDER=local
LOG_LEVEL=debug

GENERATING TEST JWTS

The generator lives at gen-tokens.mjs in the repo root.

1. Open gen-tokens.mjs and confirm SECRET matches FORUM_SECRET_KEY in .env
2. Run: node gen-tokens.mjs
   This prints a bootstrap token and placeholder role tokens
3. Call POST /forums using the bootstrap token (Section 2a below)
4. Copy the returned id into FORUM_ID in gen-tokens.mjs
5. Re-run: node gen-tokens.mjs
   Now all four role tokens contain the real forum ID

Tokens expire after 15 minutes — re-run the script when they do.

Tokens used in this plan:
BOOTSTRAP forumId=bootstrap, role=admin — only for POST /forums
ADMIN role=admin, real forum ID
MOD role=moderator, real forum ID
MEMBER role=member (Alice, sub=user-001), real forum ID
MEMBER2 role=member (Bob, sub=user-002), real forum ID

STARTING THE SERVER

npm run dev --workspace=packages/api

Server starts on http://localhost:3000
Confirm .env loaded: look for your database host in the startup logs.

All authenticated requests use: Authorization: Bearer TOKEN
Replace FORUM_ID, THREAD_1_ID, etc. with IDs returned by earlier steps.

SECTION 0 — Smoke test

curl http://localhost:3000/health

Expected: 200 { "status": "ok", "timestamp": "..." }

✅ SECTION 1 — Auth (Phase 3)

✅ 1a. Exchange admin host JWT for session token
curl -s -X POST http://localhost:3000/auth/session \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json"

Expected: 200 { sessionToken, userId, role, expiresIn }
sessionToken must have exactly 2 dots — it is a real HMAC-signed JWT.
Save as ADMIN_SESSION and ADMIN_USER_ID.

✅ 1b. Exchange member JWT for session token
Same as above with MEMBER. Save as MEMBER_SESSION and MEMBER_USER_ID.

✅ 1c. Use session token on a protected route
curl -s -X PATCH http://localhost:3000/forums/00000000-0000-0000-0000-000000000000 \
 -H "Authorization: Bearer ADMIN_SESSION" \
 -H "Content-Type: application/json" \
 -d '{}'

Expected: 404 (not 401) — auth passed, forum just doesn't exist.

✅ 1d. Tampered token rejected
Take ADMIN_SESSION, change one character in the middle section, then:
curl -s -X PATCH http://localhost:3000/forums/00000000-0000-0000-0000-000000000000 \
 -H "Authorization: Bearer TAMPERED_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{}'

Expected: 401 { error: "invalid_token" }

✅ 1e. Missing Authorization header
curl -s http://localhost:3000/forums/00000000-0000-0000-0000-000000000000

Expected: 401 { error: "missing_token" }

✅ 1f. Delete session
curl -s -X DELETE http://localhost:3000/auth/session \
 -H "Authorization: Bearer ADMIN_SESSION"

Expected: 204 (stateless — token remains cryptographically valid, client discards it)

SECTION 2 — Forums & Tags (Phase 4)

isPublic behaviour:
false (default) — GET /forums/:fid requires a valid token scoped to that forum
true — GET /forums/:fid is publicly readable without any token
All other forum endpoints (tags, threads, etc.) are unaffected by this flag.

✅ 2a. Create forum (use BOOTSTRAP token here)
curl -s -X POST http://localhost:3000/forums \
 -H "Authorization: Bearer BOOTSTRAP" \
 -H "Content-Type: application/json" \
 -d '{"name":"Test Forum"}'

isPublic defaults to false if omitted. To create a public forum:
-d '{"name":"Test Forum","isPublic":true}'

Expected: 201 { id, name, ownerId, config: { isPublic: false, ... }, createdAt }
**_ Save id as FORUM_ID, update gen-tokens.mjs, re-run node gen-tokens.mjs _**

✅ 2b. Get private forum (token scoped to that forum — passes)
curl -s http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer ADMIN"

Expected: 200 with forum object including config.isPublic: false.

✅ 2b-ii. No token on private forum — rejected
curl -s http://localhost:3000/forums/FORUM_ID

Expected: 401 { error: "missing_token" }

✅ 2b-iii. Token from a different forum — rejected
curl -s http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer BOOTSTRAP"

## Expected: 403 { error: "forbidden" }

✅ 2b-iv. Make forum public, then read without a token
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"isPublic":true}'

curl -s http://localhost:3000/forums/FORUM_ID

Expected: first call returns 200 with config.isPublic: true.
second call (no token) also returns 200.
Set it back to false afterwards:
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"isPublic":false}'

✅ 2c. Non-existent forum (no auth needed — 404 is returned before isPublic check)
curl -s http://localhost:3000/forums/00000000-0000-0000-0000-000000000000

Expected: 404 { error: "forum_not_found" }

✅ 2d. Member cannot create forum
curl -s -X POST http://localhost:3000/forums \
 -H "Authorization: Bearer MEMBER" \
 -H "Content-Type: application/json" \
 -d '{"name":"Attempt"}'
d
Expected: 403 { error: "insufficient_permissions" }

✅ 2e. Update forum config
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"moderationThreshold":0.8,"aiEnabled":true}'

Expected: 200 — config.moderationThreshold should be 0.8 in response.

2f. List tags (empty)
curl -s http://localhost:3000/forums/FORUM_ID/tags

Expected: 200 []

2g. Create tag
curl -s -X POST http://localhost:3000/forums/FORUM_ID/tags \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"name":"javascript","description":"JS-related","color":"#F7DF1E"}'

Expected: 201 { id, name, description, color, forumId }
Save id as TAG_ID.

2h. Duplicate tag name
curl -s -X POST http://localhost:3000/forums/FORUM_ID/tags \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"name":"javascript"}'

Expected: 409 { error: "tag_conflict" }

2i. Update tag
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID/tags/TAG_ID \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"color":"#FFD700"}'

Expected: 200 with updated color.

2j. Delete tag
curl -s -X DELETE http://localhost:3000/forums/FORUM_ID/tags/TAG_ID \
 -H "Authorization: Bearer ADMIN"

Expected: 204

2k. Delete non-existent tag
curl -s -X DELETE http://localhost:3000/forums/FORUM_ID/tags/00000000-0000-0000-0000-000000000000 \
 -H "Authorization: Bearer ADMIN"

Expected: 404 { error: "tag_not_found" }

SECTION 3 — Threads (Phase 5)

Use session tokens from here on (ADMIN_SESSION, MEMBER_SESSION, etc.).
Re-exchange host tokens if sessions have expired.

3a. List threads (empty)
curl -s "http://localhost:3000/forums/FORUM_ID/threads"

Expected: 200 { threads: [], total: 0, page: 1, limit: 20 }

3b. Create thread (member)
curl -s -X POST http://localhost:3000/forums/FORUM_ID/threads \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"title":"How do I reverse a string in Python?","body":"I am trying to reverse a string but I am not sure of the best approach.","tagIds":[]}'

Expected: 201 { id, title, body, authorId, status: "open", ... }
Save id as THREAD_1_ID.
Wait ~5 seconds then check DB: SELECT embedding IS NOT NULL FROM threads WHERE id = 'THREAD_1_ID'
Should be true if async embedding ran.

3c. Create second thread (for search and duplicate tests)
curl -s -X POST http://localhost:3000/forums/FORUM_ID/threads \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"title":"Python string reversal techniques","body":"What are the different ways to reverse a string in Python?","tagIds":[]}'

Expected: 201. Save as THREAD_2_ID.

3d. List threads
curl -s "http://localhost:3000/forums/FORUM_ID/threads"

Expected: 200 { threads: [...], total: 2 }

3e. Sort threads
curl -s "http://localhost:3000/forums/FORUM_ID/threads?sort=oldest" # THREAD_1_ID first
curl -s "http://localhost:3000/forums/FORUM_ID/threads?sort=latest" # THREAD_2_ID first

3f. Duplicate detection
curl -s "http://localhost:3000/forums/FORUM_ID/threads/duplicates?title=How+to+reverse+a+string+in+Python"

Expected: 200 [{ id, title, similarity }] — both Python threads should appear.
If embeddings haven't run yet, results may be empty or wrong — wait and retry.

3g. Get thread
curl -s http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID

Expected: 200 { thread: {...}, posts: [...] } — posts includes the opening post.

3h. Edit thread (author)
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"title":"How do I reverse a string in Python? [updated]"}'

Expected: 200 with updated title.

3i. Different member cannot edit another's thread
Exchange MEMBER2 host token for MEMBER2_SESSION, then:
curl -s -X PATCH http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID \
 -H "Authorization: Bearer MEMBER2_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"title":"Hijacked"}'

Expected: 403 { error: "forbidden" }

3j. Lock thread (moderator)
Exchange MOD host token for MOD_SESSION, then:
curl -s -X POST http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID/lock \
 -H "Authorization: Bearer MOD_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"locked":true}'

Expected: 200 { status: "locked", ... }

3k. Member cannot post to a locked thread
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":"This should fail"}'

Expected: 403 { error: "thread_locked" }

3l. Unlock thread
curl -s -X POST http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID/lock \
 -H "Authorization: Bearer MOD_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"locked":false}'

Expected: 200 { status: "open" }

3m. Pin thread (moderator)
curl -s -X POST http://localhost:3000/forums/FORUM_ID/threads/THREAD_1_ID/pin \
 -H "Authorization: Bearer MOD_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"pinned":true}'

Expected: 200 { pinned: true }

3n. Delete thread (soft delete)
Create a throwaway thread first, save its id as THROWAWAY_ID, then:
curl -s -X DELETE http://localhost:3000/forums/FORUM_ID/threads/THROWAWAY_ID \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 204. Confirm it no longer appears in GET /forums/FORUM_ID/threads.

SECTION 4 — Posts (Phase 6)

4a. Create post (reply to thread)
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":"You can use slicing: my_string[::-1]"}'

Expected: 201 { id, threadId, body, authorId, ... }
Save id as POST_1_ID.

4b. Nested reply
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts \
 -H "Authorization: Bearer MEMBER2_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":"Or you can use reversed() and join","parentPostId":"POST_1_ID"}'

Expected: 201 { parentPostId: "POST_1_ID", ... }
Save id as POST_2_ID.

4c. Edit post (author)
curl -s -X PATCH http://localhost:3000/threads/THREAD_1_ID/posts/POST_1_ID \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":"You can use slicing: my_string[::-1] — the most Pythonic way."}'

Expected: 200 with updated body.

4d. Add reaction
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_1_ID/react \
 -H "Authorization: Bearer MEMBER2_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"type":"helpful"}'

Expected: 200 { reactionCounts: { helpful: 1 } }

4e. Add second reaction type
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_1_ID/react \
 -H "Authorization: Bearer ADMIN_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"type":"insightful"}'

Expected: 200 { reactionCounts: { helpful: 1, insightful: 1 } }

4f. Remove reaction
curl -s -X DELETE http://localhost:3000/threads/THREAD_1_ID/posts/POST_1_ID/react \
 -H "Authorization: Bearer MEMBER2_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"type":"helpful"}'

Expected: 200 { reactionCounts: { insightful: 1 } }

4g. Report post
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_2_ID/report \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"reason":"Off-topic content"}'

Expected: 204

4h. Accept answer (thread author)
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_1_ID/accept \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 200 { isAcceptedAnswer: true }

Now accept POST_2_ID — POST_1_ID.isAcceptedAnswer should flip to false:
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_2_ID/accept \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 200 { isAcceptedAnswer: true } for POST_2_ID.

4i. Cannot accept post from a different thread
Create a post in THREAD_2_ID, save its id as POST_OTHER_ID, then:
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts/POST_OTHER_ID/accept \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 404

4j. Soft delete post
curl -s -X DELETE http://localhost:3000/threads/THREAD_1_ID/posts/POST_2_ID \
 -H "Authorization: Bearer MEMBER2_SESSION"

Expected: 204. Confirm post no longer appears in GET /forums/FORUM_ID/threads/THREAD_1_ID.

SECTION 5 — WebSocket (Phase 6)

Install wscat if needed: npm install -g wscat

Terminal A — open connection:
wscat -c "ws://localhost:3000/threads/THREAD_1_ID/ws"

Terminal B — create a post:
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":"WebSocket test post"}'

Expected in Terminal A: { "type": "post.created", "payload": { ... } } received immediately.

SECTION 6 — Search (Phase 7)

6a. Semantic search
curl -s "http://localhost:3000/forums/FORUM_ID/search?q=reverse+string+python"

Expected: 200 { results: [...], mode: "semantic" | "keyword", total, page, limit }
mode: "semantic" if local embedding is working, "keyword" if not.

6b. No results
curl -s "http://localhost:3000/forums/FORUM_ID/search?q=astrophysics+dark+matter+collision"

Expected: 200 { results: [], total: 0 }

6c. Missing query string
curl -s "http://localhost:3000/forums/FORUM_ID/search"

Expected: 400 { error: "invalid_query" }

SECTION 7 — Moderation Queue (Phase 7)

7a. List pending queue (moderator)
curl -s http://localhost:3000/moderation/queue \
 -H "Authorization: Bearer MOD_SESSION"

Expected: 200 { items: [...], total, page, limit }
Look for the item created by the report in step 4g.

7b. Member cannot access queue
curl -s http://localhost:3000/moderation/queue \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 403

7c. Approve a pending item
Note a queue item id as ITEM_ID, then:
curl -s -X PATCH http://localhost:3000/moderation/queue/ITEM_ID \
 -H "Authorization: Bearer MOD_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"action":"approved"}'

Expected: 200 { status: "approved", reviewerId: MOD_USER_ID, reviewedAt: "..." }

7d. Cannot resolve the same item twice
curl -s -X PATCH http://localhost:3000/moderation/queue/ITEM_ID \
 -H "Authorization: Bearer MOD_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"action":"removed"}'

Expected: 409 { error: "already_resolved" }

7e. Remove a post via moderation
Find or trigger another pending item. Resolve it with action: "removed".
Expected: 200 { status: "removed" }
Verify in DB: the post's status column should now be "hidden".

SECTION 8 — AI Routes (Phase 8)

Prerequisite: ANTHROPIC_API_KEY (or OPENAI_API_KEY with AI_PROVIDER=openai) must be set.
Without a real LLM key all routes in this section return 503.
Make sure THREAD_1_ID has at least 2-3 posts before running these.

8a. Summarise thread
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/ai/summarise \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 200 { summary: { keyPoints: [...], conclusion: "...", openQuestions: [...] } }

8b. Suggest answer
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/ai/suggest \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 200 { suggestion: { suggestion: "...", confidence: "high"|"medium"|"low", caveats: [...] } }

8c. Non-existent thread
curl -s -X POST http://localhost:3000/threads/00000000-0000-0000-0000-000000000000/ai/summarise \
 -H "Authorization: Bearer MEMBER_SESSION"

Expected: 404

8d. Unauthenticated request
curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/ai/summarise

Expected: 401

8e. AI unavailable (optional)
Stop server, remove ANTHROPIC_API_KEY and OPENAI_API_KEY from .env, restart, then call either endpoint.
Expected: 503 { error: "ai_unavailable" }

SECTION 9 — Error shape consistency

All errors must follow { error: string, message: string, statusCode: number }.

curl -s http://localhost:3000/nonexistent-route

curl -s -X POST http://localhost:3000/forums \
 -H "Authorization: Bearer ADMIN"

curl -s -X POST http://localhost:3000/threads/THREAD_1_ID/posts \
 -H "Authorization: Bearer MEMBER_SESSION" \
 -H "Content-Type: application/json" \
 -d '{"body":""}'

curl -s -X PATCH http://localhost:3000/forums/FORUM_ID \
 -H "Authorization: Bearer ADMIN" \
 -H "Content-Type: application/json" \
 -d '{"moderationThreshold":2}'

WHEN YOU FIND A BUG

1. Note the exact request, actual response, and expected response.
2. Fix the bug on test/backend-manual.
3. Commit: fix(<scope>): <description>
4. Re-run the failing step to confirm.
5. Continue.

PROGRESS

[ ] Section 0 — Smoke test
[ ] Section 1 — Auth (Phase 3)
[ ] Section 2 — Forums & Tags (Phase 4)
[ ] Section 3 — Threads (Phase 5)
[ ] Section 4 — Posts (Phase 6)
[ ] Section 5 — WebSocket (Phase 6)
[ ] Section 6 — Search (Phase 7)
[ ] Section 7 — Moderation Queue (Phase 7)
[ ] Section 8 — AI Routes (Phase 8)
[ ] Section 9 — Error shape consistency
