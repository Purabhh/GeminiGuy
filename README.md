# Mochee

**Live:** https://mochee-app.vercel.app

A 3D tutor and study platform. Students study their own material with a 3D tutor, then compete against each other in ranked 1v1 duels on College Board exams like the SAT and PSAT.

## The 3D tutor

Mochee stands in a white-box classroom between two browser-style windows (lecture notes on the left, a whiteboard on the right) and walks the student through a lesson: he walks, points, highlights, reveals the board step by step, narrates in a real voice and runs a quick check. Students can also upload their own PDFs and ask him questions; every answer cites the exact page and quote it came from, and he says so when the document does not cover the question.

Built with Vite 7, React 19, TypeScript, react-three-fiber, drei, Rapier physics, zustand, a Blender-built character and Gemini on a server-side proxy.

## Ranked duels (backend)

The backend is a multi-user SAT/PSAT prep platform built around a real-time 1v1 duel engine.

- **Server-owned matches.** The server owns the clock and the scoring; clients only send answers, so a match can't be gamed from the browser.
- **Horizontal scale.** Match state fans out across server instances over Redis pub/sub, so both players can be connected to different processes.
- **Ratings.** Elo updates (with placement games and a K-factor that settles as you play) run inside row-locked Postgres transactions, so concurrent finishes never apply a rating twice.
- **Event-sourced match log.** Every answer and state change is an append-only event, so any match can be replayed or audited.
- **Exactly-once payouts.** Coin rewards are keyed by idempotency keys and settled in the same transaction that marks the match finished.
- **Verified questions.** Every generated question is checked by an independent re-solve before it's published to the question bank, and question difficulty is re-rated from real match results.
- **Tested.** 100+ backend tests cover the engine, rating math, settlement and the store.

Stack: TypeScript, Node.js, PostgreSQL, Redis, WebSockets.

## Run it

```
npm install
npm run dev            # http://localhost:5176  (lesson: /tutor/cs111)
```

Keys are read only by the dev server, never by the browser:

- `gemini_API.txt` in the repo root (or `GEMINI_API_KEY`): answers, document Q&A, quizzes, topic extraction.
- `ElevenLabsAPI.txt` in the repo root (or `ELEVENLABS_API_KEY`): the tutor's voice. Lines are cached in `tmp/tts-cache/` and billed characters are capped per day (the count is kept on disk, so a restart doesn't reset it).

Both files are git-excluded and denied by the dev server's file serving. Without a Gemini key document Q&A and quizzes run in a labelled demo mode (answers built from the best matching passage, quizzes cut from real sentences); teach-back grading requires a Gemini key. Without an ElevenLabs key he falls back to the browser voice.

Use Node 24 for the server (older Node builds can lack SQLite FTS5).

Speech starts as ElevenLabs audio arrives, using the same voice and model. Browsers without MP3 MediaSource support use complete-clip playback. Answers and document citations are still validated before speech begins. Interrupting speech cancels its download; concurrent listeners for the same line share one synthesis call, and only complete clips are cached.

With the server running, `npm run warm:voice` prepares the fixed lesson narration and quiz feedback ahead of a demo. It reuses cached audio and obeys the same daily character budget. During normal lessons, a small look-ahead warms upcoming lines instead of generating every line immediately.

For local timing diagnostics, run `window.__GG_LATENCY__.samples()` in the browser console. The most recent 100 records contain elapsed milliseconds for `answerReady`, `ttsRequested`, `audioFirstChunk`, `audioDownloaded`, and `playbackStarted`, where applicable, plus the outcome. Cached clips have an `audioCached` mark. Records contain no conversation text and are never sent to a server. Use `window.__GG_LATENCY__.clear()` to reset them. Compare question records' `playbackStarted` for end-to-end delay; compare `audioFirstChunk - ttsRequested` for speech transport delay. Fallback and cancelled samples should be assessed separately.

The developer check at `/lab/voice-streaming.html` verifies early playback, caching, cancellation, and non-streaming fallback with a controlled audio stream. It fetches the fixed opening line once (a cache hit after `warm:voice`); the remaining checks use local mocks.

## Layout

- `src/`: the frontend. React UI, the 3D stage (react-three-fiber), the lesson runner, play and physics.
- `public/`: frontend assets, including the Blender-built `models/tutor.glb`.
- `server/`: the backend. The Gemini ask proxy, the ElevenLabs voice proxy and the document API (PDF ingest, SQLite FTS5, cited answers, quizzes). It runs as Vite plugins, so `npm run dev` serves both.
- `shared/`: what both sides import. The `/api/ask` contract (`askTypes.ts`), the document API contract (`docsTypes.ts`) and the lesson's notes lines (`lessonNotes.ts`), which the ask server lists in Gemini's prompt.
- `tests/`: backend and animation unit tests, and the Playwright e2e. `BLENDER/tutor/`: the character build. `lab/`: one page per slice for isolated checks.

`server/` never imports from `src/`, and `shared/` imports from neither; `npm run test:server` fails if that changes.

## Tests

```
npm run typecheck                    # app + server
npm run test:server                  # document backend: ingest, FTS, citation checks, upload limits, quiz idempotency, demo mode
npm run test:anim                    # animation state machine: priority, cooldowns, queueing
python tests/e2e/lesson_e2e.py       # the guided lesson end to end in a real browser
python tests/e2e/study_play_e2e.py   # drawers, documents, physics play, mastery and the evolving room
```

The e2e scripts need Python with Playwright and Pillow, and the dev server running. Reports and screenshots go to `tmp/e2e/`.
