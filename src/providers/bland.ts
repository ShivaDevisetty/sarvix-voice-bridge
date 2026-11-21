import type { CallingProvider, CallDetails, CallRequest, CallStart, TranscriptLine } from '../types.js';
const BASE = 'https://api.bland.ai/v1/calls';
function text(v: unknown): string { return typeof v === 'string' ? v : ''; }
function cleanId(id:string):string { if (!/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid call ID'); return id; }
export class BlandProvider implements CallingProvider {
  readonly name = 'bland' as const;
  constructor(private readonly key:string, private readonly transport: typeof fetch = fetch) {
    if (!key.trim()) throw new Error('BLAND_API_KEY is required for live calling.');
  }
  private async request(method:'POST'|'GET', url:string, body?:object):Promise<Record<string,unknown>> {
    const ctrl = new AbortController(); const timer = setTimeout(()=>ctrl.abort(),20000);
    try {
      const response = await this.transport(url,{method,headers:{Authorization:this.key,'Content-Type':'application/json'},body:body ? JSON.stringify(body):undefined,signal:ctrl.signal});
      const payload:unknown = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(`Bland API HTTP ${response.status}. Check provider dashboard and credentials.`);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid provider response.');
      const data=payload as Record<string,unknown>;
      if (data.status === 'error' || data.error) throw new Error(`Provider reported an error: ${text(data.message) || 'check dashboard'}`);
      return data;
    } finally {clearTimeout(timer)}
  }
  async start(req:CallRequest):Promise<CallStart> {
    const task = [
      'You are an assistant making a single consented decision-clarification call.',
      'Start by saying you are an AI assistant. Explain the question concisely.',
      'Ask the recipient to describe their preference in their own words.',
      'Never request passwords, OTPs, payment information, identity numbers, or confidential data.',
      'Never claim a spoken response automatically authorizes any computer action or deployment.',
      'If unsure, ask for clarification once. End politely.',
      `Question: ${req.question}`,
      req.context ? `Non-sensitive context: ${req.context}` : ''
    ].filter(Boolean).join('\n');
    const data=await this.request('POST',BASE,{phone_number:req.phoneNumber,task,record:false});
    const id=text(data.call_id) || text(data.id);
    if(!id) throw new Error('Provider response missing call_id. Check dashboard before retrying; call may already have started.');
    return {id,status:text(data.status)||'queued',provider:'bland'};
  }
  async get(id:string):Promise<CallDetails> {
    const data=await this.request('GET',`${BASE}/${encodeURIComponent(cleanId(id))}`);
    const transcript:TranscriptLine[]=Array.isArray(data.transcripts) ? data.transcripts.flatMap(v=>{
      if(!v || typeof v !== 'object')return [];
      const x=v as Record<string,unknown>; const speaker=text(x.user).toLowerCase();
      return [{speaker:speaker==='agent'||speaker==='user'?speaker:'unknown',text:text(x.text)}];
    }) : [];
    return {id,provider:'bland',status:text(data.status)||'unknown',completed:data.completed===true||data.status==='completed',answeredBy:text(data.answered_by)||undefined,summary:text(data.summary)||undefined,priceUsd:typeof data.price==='number'?data.price:undefined,transcript};
  }
}
