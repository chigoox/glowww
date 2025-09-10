// User Props Webhook integration (Phase 2)
// Allows optional posting of pipelineComplete events to an external endpoint for analytics.
// Usage:
//   import { configureUserPropsWebhook } from './userPropsWebhook';
//   configureUserPropsWebhook('https://example.com/hook');
// Endpoint receives JSON: { type:'pipelineComplete', durationMs, exprChanges, watchersTriggered, validationErrorCount, ts }
// Debounced to avoid flooding during rapid edits.

import { onUserPropsEvent } from './userPropsEngine';

let webhookUrl = null;
let queue = [];
let timer = null;
const DEBOUNCE_MS = 1500;

export function configureUserPropsWebhook(url){
  webhookUrl = url || null;
  if(!webhookUrl){ queue=[]; clearTimeout(timer); timer=null; }
}

function flush(){
  if(!webhookUrl || !queue.length) return;
  const payload = { batch: queue.slice(), ts: Date.now() };
  queue = [];
  // fire and forget; avoid blocking UI
  try {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  } catch {/* ignore */}
}

onUserPropsEvent((evt)=>{
  if(evt.type !== 'pipelineComplete') return;
  if(!webhookUrl) return;
  queue.push(evt.payload);
  if(timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
});
