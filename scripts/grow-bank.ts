// Grows the SAT/PSAT duel bank with Gemini-written, Gemini-verified questions.
//
//   node scripts/grow-bank.ts                 2 questions in every domain
//   node scripts/grow-bank.ts algebra 5       5 questions in one domain
//
// Domains: algebra, advanced, psda, geometry, craft, info, conventions, expression.
// Needs the Gemini key (GEMINI_API_KEY or gemini_API.txt). A script rather than
// an HTTP route, so nobody on the deployed site can spend the key.

import { join } from 'node:path'
import { DOCS_CONFIG } from '../server/docs/config.ts'
import { callGemini } from '../server/docs/gemini.ts'
import { seedBank } from '../server/duel/engine.ts'
import { growBank } from '../server/duel/generate.ts'
import { DOMAINS, type Domain } from '../server/duel/outline.ts'
import { SEED_QUESTIONS } from '../server/duel/seed.ts'
import { openDuelStore } from '../server/duel/store.ts'
import { readGeminiKey } from '../server/keys.ts'

const root = process.cwd()
const key = readGeminiKey(root)
if (!key) {
  console.error('No Gemini key: set GEMINI_API_KEY or add gemini_API.txt.')
  process.exit(1)
}

const [domainArg, countArg] = process.argv.slice(2)
if (domainArg && !DOMAINS.includes(domainArg as Domain)) {
  console.error(`Unknown domain "${domainArg}". Pick one of: ${DOMAINS.join(', ')}`)
  process.exit(1)
}
const domains = domainArg ? [domainArg as Domain] : DOMAINS
const count = Number(countArg) || 2

const store = openDuelStore(join(root, DOCS_CONFIG.dataDir, 'duel.db'))
seedBank(store)
let total = 0
for (const domain of domains) {
  const examples = SEED_QUESTIONS.filter((q) => q.domain === domain).slice(0, 3)
  try {
    const r = await growBank({ store, gemini: callGemini, key, domain, count, examples })
    total += r.added
    console.log(`${domain}: wrote ${r.written}, verified ${r.verified}, added ${r.added}`)
    for (const x of r.rejected) console.log(`  rejected (${x.reason}): ${x.prompt}`)
  } catch (e) {
    console.log(`${domain}: ${(e as Error).message}`)
  }
}
console.log(`Bank now holds ${store.bankCount()} questions (+${total}).`)
store.close()
