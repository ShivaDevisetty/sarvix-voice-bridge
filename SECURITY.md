# Security model

The bridge is a communication aid, not an authorization system.

## Threats mitigated

- Unapproved destinations: exact-match E.164 allowlist.
- Accidental billable calls: explicit `--confirm-live I_AUTHORIZE_ONE_PAID_CALL` on every live start.
- Credential leakage: environment-only API key; no config persistence or HTTP logging.
- Untrusted audio transcripts: never map speech into executable commands or trusted permissions.
- External inbound entry points: none (no tunnel, webhook listener, or MCP server).
- Unbounded polling: bounded timeout; no automatic redials.

## Residual risks

- CLI calls can still incur charges; concurrent invocations and provider-side retries are not centrally throttled.
- The remote provider processes call content and phone numbers.
- Phone spoofing, voicemail, transcription errors, and social engineering can produce misleading transcripts.
- `SARVIX_ALLOWED_NUMBERS` controls destination only; it does not authenticate whoever answers.
- Terminal history and tool outputs may retain question/context/transcript.
- The API key must be protected by the operator's OS and provider account policies.

## Production-hardening backlog

Provider-level spend limits; durable idempotency; persistent rate limiting; signed audit events; encrypted operator-controlled storage if needed; consent disclosure; cross-platform packaged binaries; security review; explicit integration tests against a test phone.
