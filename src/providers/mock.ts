import { randomUUID } from 'node:crypto';
import type { CallingProvider, CallDetails, CallRequest, CallStart } from '../types.js';
const calls = new Map<string,CallDetails>();
export class MockProvider implements CallingProvider {
  readonly name = 'mock' as const;
  async start(request: CallRequest): Promise<CallStart> {
    const id = `mock-${randomUUID()}`;
    calls.set(id, {id, status:'completed', completed:true, provider:'mock', answeredBy:'human', transcript:[
      {speaker:'agent',text:request.question},
      {speaker:'user',text:'This is a simulated response. No action is authorized.'}
    ], summary:'Simulated call; no external request was sent.'});
    return {id,status:'completed',provider:'mock'};
  }
  async get(id: string): Promise<CallDetails> {
    const call = calls.get(id); if (!call) throw new Error('Mock call not found in this process. Run demo to test mock end-to-end.');
    return call;
  }
}
