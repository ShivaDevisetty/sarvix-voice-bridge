import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, reviewResult, MockProvider, BlandProvider, redactPhone } from '../dist/index.js';
const env={SARVIX_ALLOWED_NUMBERS:'+13125550123'};
const request={phoneNumber:'+13125550123',question:'Should we use the smaller layout?'};
test('allows explicit number',()=>assert.doesNotThrow(()=>validateRequest(request,env)));
test('rejects unauthorized number',()=>assert.throws(()=>validateRequest({...request,phoneNumber:'+13125550124'},env),/allowlist/));
test('rejects secrets in prompt',()=>assert.throws(()=>validateRequest({...request,question:'What is your password?'},env),/secrets/));
test('rejects invalid numbers',()=>assert.throws(()=>validateRequest({...request,phoneNumber:'3125550123'},env),/E.164/));
test('redacts number',()=>assert.equal(redactPhone('+13125550123'),'+*******0123'));
test('mock call requires review',async()=>{const p=new MockProvider();const s=await p.start(request);const d=await p.get(s.id);assert.equal(d.completed,true);assert.equal(reviewResult(d).status,'requires-human-review')});
test('bland adapter generates expected request',async()=>{
 let called=false;
 const transport=async(url,opts)=>{called=true;assert.equal(url,'https://api.bland.ai/v1/calls');assert.equal(opts.headers.Authorization,'TEST');const payload=JSON.parse(opts.body);assert.equal(payload.phone_number,request.phoneNumber);assert.equal(payload.record,false);return new Response(JSON.stringify({call_id:'abc-123',status:'queued'}),{status:200})};
 const p=new BlandProvider('TEST',transport);const s=await p.start(request);assert.ok(called);assert.equal(s.id,'abc-123');
});
test('bland details parsing',async()=>{const p=new BlandProvider('TEST',async()=>new Response(JSON.stringify({status:'completed',completed:true,transcripts:[{user:'user',text:'No, postpone.'}],price:0.42}),{status:200}));const d=await p.get('id-1');assert.equal(d.priceUsd,0.42);assert.equal(d.transcript[0].speaker,'user')});
