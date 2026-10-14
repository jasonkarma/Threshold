# Threshold — LLM campaign backend (`/campaigns`)

**Status:** proposed · gateway surface confirmed (§3)
**Owner:** Karma
**Related:** [`../mobile/README.md`](../mobile/README.md) · [`../mockups/screens/a01-prompt-rules.html`](../mockups/screens/a01-prompt-rules.html)

---

## 1. What is actually broken today

The app **is** wired for a backend, and it **is** making a real network call. What is
missing is the backend itself.

`mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://lumiarouter.com      ← an LLM gateway, not our API
EXPO_PUBLIC_API_KEY=sk-39ju5...                  ← the gateway key
```

`campaignService` (`mobile/src/lib/campaign-service.ts:210`) selects `httpCampaignService`
because the URL is non-empty, so every generation does:

```
POST https://lumiarouter.com/campaigns
Authorization: Bearer sk-...
{ "seed": { "ambition": …, "friction": …, "baseline": … } }
```

`lumiarouter.com` is a unified LLM gateway. It has **no `/campaigns` route** — hence the
screenshot. That error is precise evidence: `postCampaigns` only throws
*"The campaign service returned malformed JSON"* when `response.ok` is **true** and
`response.json()` throws. So the gateway returned a **2xx with an HTML body** (its
homepage or a catch-all), not a 404 and not an auth failure. **No LLM has ever been
called.** The app has zero server code behind it — there is no `api/`, `functions/`, or
`server/` anywhere in the repo.

So the "friction + goal → Claude → missions" step is the piece that has never existed.
It needs building, and it needs to sit in a new middle layer:

```
Expo app  ──►  our server (/campaigns)  ──►  lumiarouter.com (/v1/chat/completions)  ──►  Claude
             owns the prompt,               owns the provider key
             the schema, retries
```

The app **cannot** call the gateway directly. That would put a billable provider key in a
public bundle, expose the gateway to CORS, and leave schema enforcement to the model.

---

## 2. Two corrections to make before writing any code

### 2.1 Field names: the A01 mock-up uses names the app ignores

`mockups/screens/a01-prompt-rules.html:72-81` documents the generation JSON as:

```json
{ "campaignID": "cmp_demo_01", "totalLevels": 10,
  "missions": [{ "levelNumber": 1, "missionTitle": "…", "targetContext": "public_async" }] }
```

The app expects the names in `mobile/src/lib/campaign-service.ts:180-195`:

```json
{ "id": "campaign-abc", "label": "…", "createdAt": "…",
  "missions": [{ "level": 1, "title": "…", "description": "…", "tags": ["…"],
                 "domain": "public_async", "context": "…", "tip": "…" }] }
```

`levelNumber`, `missionTitle` and `targetContext` are **silently discarded** by
`normalizeMission`, which then defaults to `title: "Level 1"`, `description: ""`,
`domain: "public_async"`. The path would render as ten untitled cards and nothing would
throw. **The prompt and the tool schema must use the app's names**, not A01's. If the
names in A01 are to be the canonical ones, the prompt must map them — but do not ship a
prompt that emits `missionTitle`.

### 2.2 The gateway key has to move, and be rotated

`EXPO_PUBLIC_*` values are inlined into the bundle at build time and are readable by
anyone who downloads the app. A billable `sk-` gateway key sitting in
`EXPO_PUBLIC_API_KEY` is compromised by construction — it has already been built into a
bundle during this debugging session. Rotate it as part of this work; it is a
prerequisite, not a follow-up.

After the change the two variables mean different things:

| Variable | Lives in | Value | Public? |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | `mobile/.env` | `http://localhost:8787` — **our** server | yes, harmless |
| `EXPO_PUBLIC_API_KEY` | `mobile/.env` | a throwaway client token | yes, harmless |
| `LLM_API_KEY` | `server/.env` | the rotated gateway key | **never** |

---

## 3. Gateway surface — RESOLVED

Confirmed by `GET https://lumiarouter.com/v1/models` with `Authorization: Bearer`:

| Question | Answer |
|---|---|
| Protocol | **OpenAI-compatible only.** Every model reports `supported_endpoint_types: ["openai"]`, and the response is an OpenAI-shaped `{ object: "list", data: [...] }`. So `LLM_PROTOCOL=openai`, base `https://lumiarouter.com/v1`. |
| Model ID | `claude-opus-5-5` — bare, unnamespaced, no vendor prefix. |
| Auth header | `Authorization: Bearer <key>`; the curl above used exactly that. |
| Our `/campaigns` | Confirmed absent — this is a gateway, it never had that route. |

Two consequences that change the build:

- **Do not write an Anthropic `/v1/messages` adapter.** It will 404 here. §6 is rewritten
  around the OpenAI shape — the original draft assumed the opposite and would have failed
  on the first call.
- **Nothing model-specific can be trusted through this route.** The catalogue reports
  `owned_by: "openai"` even on Claude models, so it is a passthrough alias list, not
  provider-native metadata. Stick to fields present in the OpenAI schema; a Claude-only
  option passed through has undefined behaviour.

Full catalogue: `claude-opus-5-5`, `claude-opus-5-5-medium`, `claude-sonnet-5-5`,
`claude-sonnet-5-5-medium`, `claude-haiku-5-5`, `claude-haiku-5-5-medium`,
`claude-fable-5-1`, `gpt-6.1-sol`, `gpt-6-astra`, `gpt-6-luna`.

The `-medium` suffixes read as reasoning-effort variants of the base models — useful as a
latency lever (§6), not as a different model.

### 3.1 What `/v1/models` does *not* prove

The list is **gateway-controlled aliases**, not provider metadata. Two tells:

- Every entry reports `owned_by: "openai"`, including the Claude ones — so that field is
  synthesised, not passed through from a provider.
- The IDs are bare and unnamespaced (`claude-opus-5-5`), unlike the vendor-prefixed
  form most gateways use for upstream passthrough.

Concretely: a listing is not evidence that `claude-opus-5-5` resolves to the model the
name implies. It only proves the gateway will *accept that string*. Caching, silent
substitution and fallback-to-a-cheaper-model are all invisible from this endpoint, and
a gateway configured to do any of them is indistinguishable here from one that does not.

This does **not** block the build — the app does not care which model answers. It does
change two pieces of the plan:

1. **Verification step 2 (§8) is load-bearing, not a formality.** One real
   `/v1/chat/completions` call is the only thing that proves the alias resolves at all,
   and its `model` field in the response is what to record.
2. **Log the model string the API echoes back**, not the one we sent. If the two differ,
   that is the gateway substituting, and it is far better to learn that from a log line
   on day one than to spend an afternoon debugging mission quality against the wrong
   hypothesis.

---

## 4. Shape of the work

New sibling directory `server/`, so the repo becomes:

```
mobile/     the app
server/     ← NEW: the /campaigns route. Zero dependencies, Node 22 built-ins only
mockups/
plans/
```

Zero dependencies is deliberate: Node 22 has `fetch`, `node:http` and `node:crypto`, so
there is no `npm install`, no build step, and no lockfile to maintain. Plain ESM `.js`
with JSDoc types — `node server/index.js` and it runs. TypeScript would need a build or
`--experimental-strip-types`, which is not worth it for ~300 lines.

### Files

| File | Responsibility |
|---|---|
| `server/index.js` | HTTP server: routing, CORS, auth, JSON body parsing, error mapping |
| `server/campaigns.js` | Orchestration: validate seed → prompt → call model → extract → validate → retry |
| `server/prompts/campaign.js` | System prompt + tool JSON schema, in one editable place |
| `server/llm.js` | OpenAI-compatible adapter (§3), timeout, retry/backoff, usage logging |
| `server/validate.js` | Coerce + hard-fail on unusable output; mirrors the app's normalizer |
| `server/.env.example` | Documented config |
| `server/README.md` | How to run, how to curl it, how to point the app at it |

Prompt text lives in its own file because A01 (*Prompt Rules*, Story 5) exists precisely
to edit prompt templates without shipping a binary. Keeping them in a module now means
that admin screen can later write to a table and this module reads from it.

---

## 5. The contract (unchanged on the app side)

The server must satisfy the contract the app already implements. **No app changes are
needed to `campaign-service.ts`** — only `.env`.

**Request** — `POST /campaigns`

```
Authorization: Bearer <CLIENT_API_KEY>
Content-Type: application/json

{ "seed": { "ambition": "…", "friction": "…", "baseline": "…" } }
```

**Response** — `200`

```json
{
  "id": "cmp_…",
  "label": "Build a founder network",
  "createdAt": "2026-10-14T00:00:00.000Z",
  "missions": [
    { "level": 1, "title": "…", "description": "…", "tags": ["Specific", "Public"],
      "domain": "public_async", "context": "Public async · Low social risk · ~5 minutes",
      "tip": "…" }
  ]
}
```

One field the model owns, two the **server** owns:

- **`label`** — the model's `name` for the campaign, passed through by
  `coerceName`/`validateCampaign`. The model is the only party that has read the
  ambition, the friction and the baseline together, so it is the only party that can say
  what the path is *for* in a few words. **This was originally computed deterministically**
  by slicing the first clause out of the ambition (the `shortenAmbition` rule still in
  `mobile/src/lib/mock-campaign.ts`) — free, but it named the wrong thing: the opening
  words the user typed are the input, not the destination, and labels like "Network with
  startup founders and build real relationships" read as truncated sentences. The name is
  generated (`name` in the tool schema, required by `validate.js`, max 60) and prompt rules
  forbid reusing the ambition's opening words. `shortenAmbition` survives only as the app's
  fallback when a response omits `label`.
- **`id` / `createdAt`** — `crypto.randomUUID()` and `new Date().toISOString()`. Note
  the app's own fallback uses `campaign-${Date.now()}`; a real ID format is better once
  persistence lands.

The server also **renumbers** `level` to a gapless `1..N` after sorting. The app sorts by
level but never renumbers (`campaign-service.ts:154`), so a model that returns
`1,2,3,5,6…` would produce a path with a permanently locked level.

`completedLevels` is accepted by the app but always empty on first generation — omit it.

**Errors** — the app maps status → message (`campaign-service.ts:114-120`):

| Status | App shows | When |
|---|---|---|
| `401` / `403` | "The campaign service rejected this app key." | bad/missing `CLIENT_API_KEY` |
| `502` | "Campaign service returned 502." | model failed or output unusable after retries |
| `504` | "Campaign service returned 504." | model exceeded the server's own deadline |

---

## 6. Getting JSON out of Claude reliably

This is where naive implementations fail, so it is worth being explicit.

**Primary — forced function call (OpenAI shape).** The OpenAI equivalent of Anthropic's
forced tool use. Declare one function whose `parameters` *is* the response contract, then
force it:

```js
tools: [{ type: 'function', function: { name: 'emit_campaign', parameters: CAMPAIGN_SCHEMA } }],
tool_choice: { type: 'function', function: { name: 'emit_campaign' } }
```

The reply lands at `choices[0].message.tool_calls[0].function.arguments` — a **JSON
string**, so it still needs one `JSON.parse`, but there are no fences and no prose to
strip. This is the shape most gateway implementations already translate into Anthropic
tool use internally, which is exactly why it is primary here rather than `response_format`.

**Secondary — `response_format: json_schema`.** Anthropic has no native JSON-schema mode,
so a gateway can only honour this by translating it into a forced tool it defines itself.
Treat it as an *opportunistic* upgrade, never as the only mechanism. Gateways that do not
support it commonly answer `400`; the adapter should detect a 400 whose body mentions
`response_format`, drop the parameter and retry immediately instead of treating it as a
hard failure.

**Tertiary — tolerant extraction.** Whatever comes back, parse defensively:

1. read `tool_calls[0].function.arguments` when present, else `message.content`
2. strip ``` fences
3. scan for the first `{`, walk the braces tracking string-escape state, take the first
   balanced block
4. `JSON.parse`

Do **not** rely on `response_format: { type: 'json_object' }` alone — many gateways
silently ignore it, and a silently-ignored constraint is worse than none because the code
believes it is protected.

**Validation gate — fail loudly.** `server/validate.js` coerces every mission and
requires ≥1 mission with a non-empty `title` and a valid `domain`. Anything else throws,
and the route returns `502` with a human-readable reason. This is the opposite of the
app's philosophy and deliberately so: `normalizeCampaign` defaults missing fields so a
screen never crashes, which also means garbage renders as ten cards titled "Level 1"
with no error. The server is the last place that can tell the difference, so it must be
the strict one.

**One repair retry.** On validation failure, re-prompt with the failure appended
(`"Your previous output failed validation: mission 4 has domain 'public'…"`) and try
once more. Cap at 1 repair. Also retry once with backoff on `429`/`5xx`. Never retry on
`4xx` auth errors — that just burns quota.

**Model choice.** `LLM_MODEL=claude-opus-5-5` — decided. Two notes recorded, not argued:

- Opus is the slowest and most expensive entry in the catalogue, and the app's hard
  ceiling is 60s. If generations start landing near the 45s server deadline, the first
  lever is `claude-opus-5-5-medium` (same model, lower reasoning effort), and
  `claude-sonnet-5-5` after that. Both are one-line `.env` changes — which is the whole
  reason `LLM_MODEL` is config and not a constant in the prompt module.
- Log token usage per call from the very first request. That is the A02 (*API Usage*,
  Story 6) dataset, and it is the only way to justify or overturn this choice with real
  numbers later.

---

## 7. Operational details that will otherwise bite

**CORS — this will break on web first.** The app runs at `localhost:8081`; the server at
`localhost:8787`. Cross-origin, and the request carries `Authorization` and
`Content-Type: application/json`, so it is preflighted:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: POST, OPTIONS
```

`OPTIONS` must return `204` before any auth check — a preflight carries no
`Authorization` header, so an auth-first server rejects the preflight and the browser
reports a generic CORS failure that looks nothing like an auth problem.

**Timeout budget.** The app aborts at `REQUEST_TIMEOUT_MS = 60_000`
(`campaign-service.ts:59`). The server's model call must finish *inside* that with room
to spare, so it needs its own deadline of **~45s**, returning a clean `504` well before
the app gives up — otherwise the user sees "Generation timed out" with no server-side
record of why. This is tighter on Opus than it would be on a mid-tier model: generation
of 10 missions is a large structured output, and since the request is non-streaming the
server hears nothing until it is entirely done. If `LLM_MAX_TOKENS` is set too low the
model truncates mid-array and produces invalid JSON with no obvious cause — 4096 is a
safe floor.

**`localhost` on a physical device.** An iPhone running Expo Go resolves `localhost` to
*itself*. Simulation and web are fine; a real device needs the Mac's LAN IP
(`EXPO_PUBLIC_API_URL=http://192.168.1.x:8787`). Worth a line in `server/README.md`
because the failure mode is a bare "Could not reach the campaign service."

**Secrets hygiene.** `server/.env` must be git-ignored alongside `mobile/.env`.

**Cost and abuse guard.** The route is unauthenticated against everything except one
shared client token in a public bundle — meaning it is effectively open to anyone who
extracts that token. Before this is reachable from anywhere but localhost it needs a
per-token rate limit. An in-memory token bucket (N generations/hour) is enough for now
and is a few lines. Log `usage.input_tokens` / `usage.output_tokens` from every call from
day one — that is exactly the data A02 (*API Usage*, Story 6) is designed to display,
and it cannot be recovered retroactively.

**Structured logging.** One line per request: campaign id, model, latency, token usage,
attempt count, outcome. When a generation fails in the app, this is the only place the
real reason exists — S08 shows a single sentence and nothing more.

---

## 8. Verification plan

Cheap, ordered, each step isolating one seam:

1. **Gateway reachable** — done (§3). Key, URL, protocol and model ID all confirmed.
2. **Gateway → Claude** — a minimal `/v1/chat/completions` call from the shell returning a
   two-word reply, with `claude-opus-5-5`. Proves the model ID resolves and auth is
   accepted *before* any server code exists, so a later failure is unambiguous.
3. **Server → gateway** — `curl -X POST localhost:8787/campaigns` with a seed. Proves the
   prompt produces schema-valid missions. Run it **twice with different friction text**;
   the titles must differ substantively. Identical output across two runs is the
   signature of a cached or canned response.
4. **App → server** — restart the dev server (**required** — Expo inlines
   `EXPO_PUBLIC_*` at bundle time and hot reload will not pick up the `.env` change),
   run onboarding, confirm the generated titles are *not* the nine verbatim strings from
   `mobile/src/lib/mock-campaign.ts`.
5. **Failure paths** — stop the server (expect "Could not reach the campaign service."),
   set a wrong `CLIENT_API_KEY` (expect "…rejected this app key."), set a wrong
   `LLM_MODEL` (expect a `502` and a clear server log, *not* a hang).
6. **Cross-platform** — web at 390×844, then iOS Simulator. CORS only manifests on web;
   the device/LAN-IP issue only on hardware.

---

## 9. Explicitly out of scope

- Persistence, auth, and Supabase — the server is stateless; `store/app-store.tsx` stays
  the only writer of `campaign`/`debriefs`.
- Streaming progress. S08's status lines are a client-side 1400ms ticker
  (`campaign-service.ts:66`) and are already honest about not being server-reported.
  Regenerating individual missions, and the A01 admin UI itself.
- Deployment. Run it on `localhost:8787` first; hosting, TLS and a real auth story come
  after the loop works end to end.

---

## 10. Order of work

1. Discover the gateway — **done** (§3). OpenAI shape, `claude-opus-5-5`, Bearer auth.
2. Rotate the gateway key; create `server/.env`; blank the app's `EXPO_PUBLIC_API_KEY`
   to a fresh throwaway token.
3. `server/prompts/campaign.js` — schema + prompt, using the **app's** field names (§2.1).
4. `server/llm.js` + `server/validate.js` — adapter, timeout, tolerant extraction.
5. `server/campaigns.js` + `server/index.js` — orchestration, CORS, auth, error mapping.
6. Repoint `mobile/.env` at `localhost:8787`; restart; run verification steps 3–6.
7. Add the rate limit and usage logging before this leaves localhost.
