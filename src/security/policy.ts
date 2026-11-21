import type { CallRequest, CallDetails } from '../types.js';
const E164 = /^\+[1-9]\d{7,14}$/;
export function allowedNumbers(env: NodeJS.ProcessEnv): string[] {
  return (env.SARVIX_ALLOWED_NUMBERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
}
export function validateRequest(request: CallRequest, env: NodeJS.ProcessEnv): void {
  if (!E164.test(request.phoneNumber)) throw new Error('Phone number must be E.164 (+countrycode...).');
  const allow = allowedNumbers(env);
  if (!allow.length || !allow.every(n => E164.test(n))) throw new Error('Configure valid SARVIX_ALLOWED_NUMBERS.');
  if (!allow.includes(request.phoneNumber)) throw new Error('This phone number is not in the explicit allowlist.');
  if (!request.question.trim() || request.question.length > 1200) throw new Error('Question must be 1–1200 characters.');
  if ((request.context ?? '').length > 1000) throw new Error('Context must be <= 1000 characters.');
  const combined = `${request.question} ${request.context ?? ''}`;
  if (/\b(password|api[ _-]?key|secret|recovery code|one[ -]?time password|credit card number|social security number)\b/i.test(combined)) {
    throw new Error('Do not include secrets or sensitive identifiers in call requests.');
  }
}
export function redactPhone(phone: string): string { return phone.replace(/\d(?=\d{4})/g, '*'); }
export function reviewResult(details: CallDetails): {status: 'requires-human-review' | 'no-response'; guidance: string} {
  const spoken = details.transcript.filter(t => t.speaker === 'user' && t.text.trim());
  return spoken.length
    ? {status:'requires-human-review', guidance:'Read transcript yourself. Spoken consent does not authorize Git, deployment, payments, or system changes.'}
    : {status:'no-response', guidance:'No verified human decision was received. Do not take action.'};
}
