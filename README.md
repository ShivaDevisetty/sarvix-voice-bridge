# Sarvix Voice Bridge

An independently developed, provider-adaptable TypeScript CLI and Claude Code skill for **consented phone decision requests**. The bridge can place a single Bland AI call, retrieve a transcript, and return it for human review. It never executes a spoken decision as a command.

**Default: mock. Live calls: explicitly gated and potentially paid.** No background daemon, webhook, tunnel, or local HTTP server.

## Requirements

- Node.js 20+ and npm
- Your own phone number and consent to receive calls
- For live calls only: a Bland account with usable API credentials and billing arrangement

## Quick start (Windows PowerShell)

```powershell
npm install
npm test
npm run build
$env:SARVIX_ALLOWED_NUMBERS='+13125550123' # replace with your number
node dist/cli.js doctor
node dist/cli.js demo --phone '+13125550123' --question 'Should we choose layout A or B?'
```

No external phone request is made by `demo`.

## Live call (explicit authorization)

Read current Bland pricing and terms before calling. Your number must be allowlisted.

```powershell
$env:SARVIX_ALLOWED_NUMBERS='+13125550123'
$env:BLAND_API_KEY='YOUR_API_KEY'
node dist/cli.js call --provider bland --phone '+13125550123' --question 'Should we ship this UI change after testing?' --confirm-live I_AUTHORIZE_ONE_PAID_CALL
```

Output contains `call.id`. Later:

```powershell
node dist/cli.js wait --provider bland --id 'CALL_ID' --max-seconds 180
# or
node dist/cli.js status --provider bland --id 'CALL_ID'
```

The CLI does not auto-call again after timeouts. Check your dashboard before retrying.

### macOS/Linux

```bash
export SARVIX_ALLOWED_NUMBERS='+13125550123'
node dist/cli.js demo --phone '+13125550123' --question 'Approve this design concept for review?'
```

## Install the Claude Code skill

Copy `.claude/skills/sarvix-voice-bridge/` to your Claude Code user skills directory (`~/.claude/skills/sarvix-voice-bridge/`) or retain the repo-level copy. In Claude Code, read its `SKILL.md`. Configure this repo's absolute directory in the Claude session before using commands. Do not install it into another application's production code.

## Architecture

- `src/security/policy.ts`: explicit destination allowlist, prompt/phone validation, basic sensitive-term guard, review-only status.
- `src/providers/mock.ts`: no-network provider for tests/demos.
- `src/providers/bland.ts`: REST adapter. POST `/v1/calls`, GET `/v1/calls/{id}`.
- `src/cli.ts`: commands and explicit live-call gate.
- `tests/`: policy and mocked HTTP tests (never calls a live provider).

## Deliberate limitations and threats

- **Not an authentication mechanism.** A voice response and caller ID cannot prove identity. The bridge returns `requires-human-review`, never `approved` or automatic deployment permission.
- **No speech-to-command actions.** Claude must not interpret a spoken statement as permission to push, deploy, purchase, disclose secrets, or change access.
- **No recording requested:** request sets `record:false`, but provider may process/transcribe conversations per its own data retention policy.
- **No webhook/tunnel:** poll call details through the authenticated provider API; do not expose your laptop to the public internet.
- **No transcript storage:** results print to stdout; users/operators are responsible for terminal logs, chat transcripts, and provider retention.
- **Rate limits:** each CLI invocation authorizes at most one attempt, but there is no persistent global rate limiter. For production, implement provider spend caps and cross-process budgets first.
- **Prompt filter is not comprehensive:** do not send any confidential data. The provider receives question/context, destination number and the conversation.
- **API variations:** Bland may change field names or authentication behavior. Verify against live vendor docs before first paid call; run mock tests first.
- **No guaranteed deliverability:** status may report failed or voicemail; retry only after checking status and getting new explicit permission.
- **Not integrated into Sarvam Maya Core.** This is a standalone developer tool; no Prisma, Vercel, Neon, mobile app, or authentication changes.

## Provider design

`CallingProvider` provides `start()` and `get()`. A new service can implement those methods without changing the CLI's decision-review behavior. The CLI currently supports `mock` and `bland` only; adding another provider requires explicit source changes and tests.

## Security practices

- Never commit `.env` or API keys.
- Limit Bland API key privileges if supported.
- Allowlist only your own or explicitly consenting recipients.
- Request permission for every single live call; no recurring automatic dialing.
- Check current local call-recording/consent rules before using telephony.
- Avoid sensitive personal data in prompts or calls.

## License and attribution

Original integration code is MIT-licensed. This project uses Bland's separately operated calling API and is not affiliated with or endorsed by Bland. Provider names remain where technically required. It does **not** incorporate source code from third-party Claude skills.
