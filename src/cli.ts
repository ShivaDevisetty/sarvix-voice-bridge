#!/usr/bin/env node
import { BlandProvider, MockProvider, allowedNumbers, redactPhone, reviewResult, validateRequest } from './index.js';
import type { CallingProvider } from './types.js';
function parse(argv:string[]):{command:string;options:Record<string,string|boolean>} {
  const [command='help',...args]=argv;const options:Record<string,string|boolean>={};
  for(let i=0;i<args.length;i++){
    if(!args[i].startsWith('--'))throw new Error(`Unexpected argument: ${args[i]}`);
    const key=args[i].slice(2); if(!/^[a-z][a-z-]*$/.test(key))throw new Error('Invalid option');
    if(options[key]!==undefined)throw new Error(`Repeated --${key}`);
    options[key]=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;
  }
  return {command,options};
}
function value(o:Record<string,string|boolean>,k:string,required=true):string {
  const v=o[k];if(typeof v!=='string'||!v.trim()){if(required)throw new Error(`Provide --${k} VALUE`);return '';}return v;
}
function provider(env:NodeJS.ProcessEnv,selected?:string):CallingProvider {
  const name=selected||env.SARVIX_VOICE_PROVIDER||'mock';
  if(name==='mock')return new MockProvider();
  if(name==='bland')return new BlandProvider(env.BLAND_API_KEY||'');
  throw new Error('Unknown provider (valid: mock, bland).');
}
function log(v:unknown){process.stdout.write(JSON.stringify(v,null,2)+'\n')}
function help(){process.stdout.write(`sarvix-voice-bridge (Node 20+)\n\nCommands:\n  doctor\n  demo --phone +1... --question "Is Tuesday good?"\n  call --provider bland --phone +1... --question "..." --confirm-live I_AUTHORIZE_ONE_PAID_CALL\n  status --provider bland --id CALL_ID\n  wait --provider bland --id CALL_ID [--max-seconds 180]\n\nSet SARVIX_ALLOWED_NUMBERS. Live calls also require BLAND_API_KEY.\nMock demo never contacts Bland. Phone decisions NEVER execute actions.\n`)}
async function main(){
  const {command,options}=parse(process.argv.slice(2));
  if(command==='help'||command==='--help'){help();return}
  if(command==='doctor'){log({node:process.version,provider:process.env.SARVIX_VOICE_PROVIDER||'mock',allowedNumbers:allowedNumbers(process.env).map(redactPhone),keyPresent:Boolean(process.env.BLAND_API_KEY),liveCallsDefaultDisabled:true});return}
  if(command==='demo'||command==='call'){
    const req={phoneNumber:value(options,'phone'),question:value(options,'question'),context:value(options,'context',false)};
    validateRequest(req,process.env);
    const name=command==='demo'?'mock':value(options,'provider');
    if(command==='call'&&(name!=='bland'||options['confirm-live']!=='I_AUTHORIZE_ONE_PAID_CALL'))throw new Error('Live calls require --provider bland --confirm-live I_AUTHORIZE_ONE_PAID_CALL.');
    const p=provider(process.env,name);const start=await p.start(req);
    log({call:start,phone:redactPhone(req.phoneNumber),note:'Call initiated. No computer action will be taken.'});
    if(command==='demo'){const details=await p.get(start.id);log({details,review:reviewResult(details)})}
    return;
  }
  if(command==='status'||command==='wait'){
    const id=value(options,'id'); const p=provider(process.env,value(options,'provider'));
    if(p.name==='mock')throw new Error('Use demo for mock provider. Mock calls are in-memory only.');
    if(command==='status'){const details=await p.get(id);log({details,review:reviewResult(details)});return}
    const secs=Number(options['max-seconds']??180);
    if(!Number.isInteger(secs)||secs<5||secs>600)throw new Error('--max-seconds must be an integer from 5 to 600');
    const deadline=Date.now()+secs*1000;
    while(Date.now()<deadline){
      const d=await p.get(id);
      if(d.completed||['failed','error','busy','no-answer','canceled'].includes(d.status.toLowerCase())){log({details:d,review:reviewResult(d)});return}
      await new Promise(r=>setTimeout(r,5000));
    }
    log({id,state:'timed-out',note:'Call status unknown. Check status before retrying; do not place a duplicate call.'});
    process.exitCode=2;return;
  }
  throw new Error(`Unknown command ${command}`);
}
main().catch(e=>{process.stderr.write(`Error: ${e instanceof Error?e.message:String(e)}\n`);process.exitCode=1});
