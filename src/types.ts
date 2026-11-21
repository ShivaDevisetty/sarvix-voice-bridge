export type ProviderName = 'mock' | 'bland';
export interface CallRequest { phoneNumber: string; question: string; context?: string; }
export interface CallStart { id: string; status: string; provider: ProviderName; }
export interface TranscriptLine { speaker: 'agent' | 'user' | 'unknown'; text: string; }
export interface CallDetails { id: string; status: string; completed: boolean; answeredBy?: string; transcript: TranscriptLine[]; summary?: string; priceUsd?: number; provider: ProviderName; }
export interface CallingProvider { name: ProviderName; start(req: CallRequest): Promise<CallStart>; get(id: string): Promise<CallDetails>; }
export type ReviewStatus = 'requires-human-review' | 'no-response';
