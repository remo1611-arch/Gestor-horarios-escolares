import { generateProposalCooperative } from './generator.mjs';
import { runP12WebSolver } from './p12_web_solver.mjs';

let active = null;

self.addEventListener('message', async (event) => {
  const message = event.data || {};
  if (message.type === 'CANCEL') {
    if (active && (!message.requestId || active.requestId === message.requestId)) active.cancelled = true;
    return;
  }
  if (message.type !== 'START') return;
  if (active) {
    self.postMessage({ type:'RESULT', payload:{
      contractVersion:'generation-execution-contract-1.0', request:null,
      response:{ contractVersion:'generation-execution-contract-1.0', requestId:'', status:'ERROR', startedAt:new Date().toISOString(), finishedAt:new Date().toISOString(), durationMs:0, progress:null, hasUsableProposal:false, proposalId:'', error:{name:'GenerationBusyError',message:'Ya hay una ejecución activa.'}, message:'La ejecución terminó con un error controlado.' },
      proposal:null,
    }});
    return;
  }
  const token = { requestId:String(message.options?.requestId || ''), cancelled:false };
  active = token;
  let lastReported = -5;
  const runner = message.options?.engineKind === 'P12_WEB_SOLVER' ? runP12WebSolver : generateProposalCooperative;
  const result = await runner(message.project, message.options || {}, {
    shouldCancel:()=>token.cancelled,
    onProgress:(progress)=>{
      if (progress.processed === 0 || progress.processed === progress.total || progress.processed - lastReported >= 5) {
        lastReported = progress.processed;
        self.postMessage({type:'PROGRESS',payload:progress});
      }
    },
    yieldEvery:4,
  });
  if (!token.requestId && result.request?.requestId) token.requestId = result.request.requestId;
  self.postMessage({ type:'RESULT', payload:result });
  active = null;
});
