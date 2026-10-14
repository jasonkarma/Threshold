# Threshold — campaign backend

The missing middle layer. Turns the three onboarding answers into a mission path
by calling an LLM, and answers the `POST /campaigns` contract the app already
implements.

```
Expo app  ──►  this server  ──►  LLM gateway  ──►  Claude
```

The app cannot call the gateway directly: that would put a billable key inside a
public app bundle and leave schema enforcement to the model. Design notes and the
reasoning behind each decision are in
[`../plans/threshold-llm-backend-plan.md`](../plans/threshold-llm-backend-plan.md).

## Quick start

```bash
cd server
cp .env.example .env      # then fill in LLM_API_KEY and CLIENT_API_KEY
node index.js             # no npm install — there are no dependencies
```

Requires Node 20.6+ (uses `AbortSignal.any`). The app requires Node 22, so that
is already satisfied if you have run the app.

On boot:

```
[boot] Threshold campaign backend on http://localhost:8787
[boot] model=claude-opus-5-5 gateway=https://lumiarouter.com/v1
[boot] rate limit=20/hour  deadline=50000ms
[boot] POST /campaigns  ·  GET /health
```

If a setting is missing or dangerous the server exits with a list of problems
rather than starting and failing on the first request.

## Pointing the app at it

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_API_KEY=<the same value as CLIENT_API_KEY>
```

Restart the dev server. Expo inlines `EXPO_PUBLIC_*` at bundle time, so a hot
reload will **not** pick up the change — you will keep hitting the old URL until
you restart.

Settings → Connection in the app shows which generator is live, so a stale
`mobile/.env` is visible in the UI rather than only in the logs.

### On a physical device

`localhost` resolves to the phone itself, not your Mac. Use the LAN IP:

```bash
ipconfig getifaddr en0     # e.g. 192.168.1.42
# EXPO_PUBLIC_API_URL=http://192.168.1.42:8787
```

The failure mode here is a bare "Could not reach the campaign service." in the
app and nothing at all in the server log, because the request never arrives.

## Verifying it works

Ordered so each step isolates one seam. Run them in sequence — if step 4 fails
after 3 passed, the problem is the app, not the model.

```bash
# 1. health — is the server up and what is it configured with
curl -s localhost:8787/health

# 2. the route end to end
curl -s -X POST localhost:8787/campaigns \
  -H "Authorization: Bearer $CLIENT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"seed":{"ambition":"Network with startup founders","friction":"Fear of awkward cold approaches","baseline":"Comment thoughtfully on one founder post"}}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log(c.label);c.missions.forEach(m=>console.log(m.level, m.title, '·', m.domain))})"
```

**Run step 2 twice with different `friction` text.** The titles must differ
substantively. Identical output across two runs is the signature of a cached or
canned response, not generation.

`c.label` prints first because it is the quickest thing to check by eye. It
should **not** echo the ambition you sent: `{"ambition":"Network with startup
founders"}` should come back as something like `Build a founder network`. A label
that reads as the first few words of the ambition means the model ignored rule 1
of the naming block, and the campaign will be named after the *input* rather than
the goal.

```bash
# 3. failure paths — each must produce the stated message, not a hang
curl -s -X POST localhost:8787/campaigns -H 'Content-Type: application/json' -d '{}'      # 422, seed missing
curl -s -X POST localhost:8787/campaigns -H 'Authorization: Bearer wrong' -d '{}'          # 401
```

```bash
# 4. the app: restart the dev server, run onboarding, and compare the titles
#    against the nine hardcoded strings in mobile/src/lib/mock-campaign.ts.
#    If you see "Send one non-ask DM" verbatim, the app is still on the mock.
cd ../mobile && npm run web
```

## Configuration

Everything lives in `server/.env` — see [`.env.example`](.env.example) for the
annotated list. Full reference:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | Listen port. The app must agree. |
| `CLIENT_API_KEY` | *(empty)* | Token the app sends. **Public by construction** — it ships in the app bundle. Blank disables the check; the server warns at boot. |
| `RATE_LIMIT_PER_HOUR` | `20` | Generations per client key per hour. `0` disables. |
| `LLM_BASE_URL` | `https://lumiarouter.com/v1` | Gateway base, including `/v1`. **Not** the same as the app's `EXPO_PUBLIC_API_URL`. |
| `LLM_MODEL` | `claude-opus-5-5` | Model ID. Alternatives: `…-medium` variants, or `claude-sonnet-5-5`. |
| `LLM_API_KEY` | *(empty)* | The billable gateway key. Never leaves this process. |
| `LLM_MAX_TOKENS` | `8192` | Too low truncates the JSON mid-array. |
| `LLM_TIMEOUT_MS` | `40000` | Per attempt. |
| `OVERALL_DEADLINE_MS` | `50000` | All attempts combined. Must stay under 60000 — the server refuses to boot above it. |

## How generation works

0. **The model names the campaign.** `name` is a required field in the tool
   schema — 2–5 words stating the goal the path serves ("Build a founder
   network"), not the opening words of the ambition the user typed. The prompt
   forbids replaying the ambition, restating the friction, or describing how the
   user feels. The name becomes the `label` the app shows on Home, Campaigns,
   Progress, Settings and History.

1. **Validate the seed.** Missing fields → `422` before any tokens are spent.
2. **Force a function call.** The request pins `tool_choice` to one function
   whose `parameters` *is* the response contract (`prompts/campaign.js`), so the
   reply arrives as structured data with no markdown fences or preamble.
3. **Coerce and renumber.** `validate.js` maps the mission fields onto the app's
   names, normalises the domain vocabulary, and renumbers levels gaplessly.
4. **Repair once.** On a validation failure the specific error is fed back and
   the model gets exactly one more attempt. Auth errors and token-limit
   truncations are *not* retried — repeating an identical call cannot change
   either.
5. **Shape the response.** `id` and `createdAt` are generated; `label` is the
   model's validated `name`, passed through unchanged.

### Why the server is strict when the app is lenient

`normalizeCampaign` in the app defaults every missing field so a screen can never
crash. That is right for a client, and it means garbage renders as ten plausible
cards titled "Level 1" with nothing reporting an error. This server is the last
place that can tell the difference, so it is the one that fails loudly.

### Output field names

The prompt emits **the app's** names — `level`, `title`, `description`, `tags`,
`domain`, `context`, `tip`, plus a top-level `name` that `validate.js` maps onto
the app's `label`. Note this differs from
[`../mockups/screens/a01-prompt-rules.html`](../mockups/screens/a01-prompt-rules.html),
which documents `levelNumber` / `missionTitle` / `targetContext`. The app does not
read those, and would silently discard every mission.

## Logs

One line per request and per model call:

```
[llm] attempt=1 model=claude-opus-5-5 latency=24118ms in=812 out=2404 total=3216
[campaign] ok id=cmp_1f3… missions=9 total=24390ms
```

Token usage is the A02 (*API Usage*) dataset and cannot be reconstructed after
the fact — keep it from the first request.

If the gateway echoes back a different model than the one requested, the log says
so explicitly. That list is a passthrough alias table (`owned_by: "openai"` even
on the Claude entries), so a substitution is possible and would otherwise be
invisible.

## Limitations

- **No persistence.** Stateless — the app's reducer remains the only writer of
  campaign and debrief state. Nothing survives a server restart because nothing
  is stored.
- **The client key is public.** It is inlined into the app bundle, so the rate
  limit slows abuse rather than preventing it. Real protection needs a
  server-issued token per install.
- **No streaming.** The status lines on screen are the app's own 1400ms ticker
  (`campaign-service.ts`), not server-reported progress. The request is
  non-streaming, so the server hears nothing until generation is complete.
- **Localhost only.** No TLS, no deployment, no auth beyond the shared token.

## Layout

```
server/
  index.js              HTTP: routing, CORS, auth, rate limit, error mapping
  campaigns.js          orchestration: seed → prompt → validate → repair → shape
  llm.js                gateway adapter, timeout, tolerant extraction
  validate.js           coercion, renumbering, hard failures
  config.js             .env loading and fail-fast boot checks
  prompts/campaign.js   system prompt, user prompt, JSON schema
```

`prompts/campaign.js` is deliberately its own module: mock-up A01 (*Prompt
Rules*, Story 5) exists to let templates be edited without shipping a new app
binary, and this is the seam that admin screen would write through.
