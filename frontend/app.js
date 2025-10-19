// Coach Prep – app.js (LLM Response integrated + Backend Judge + API Playground)
const cfg = {
  USE_MOCK: true,
  ENDPOINTS: {
    upload: '/api/upload',
    transcribe: '/api/transcribe',
    analyze: '/api/analyze',
    feedback: '/api/feedback',
    judge: '/api/judge',
    // llm: '/api/submit'   // NEW: FastAPI endpoint that returns response/wpm/average/most_used_filler/most_filler/score
  }
};

const RUN_CFG = { maxAttempts: 3, timeoutMs: 1500 };

const $  = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

/* ---------- helpers ---------- */
function formatBytes(bytes){
  if(bytes===0) return '0 B';
  const k=1024, sizes=['B','KB','MB','GB'], i=Math.floor(Math.log(bytes)/Math.log(k));
  return (bytes/Math.pow(k,i)).toFixed(1)+' '+sizes[i];
}
function setStepState(idx, state){
  const chip = $('#steps').children[idx];
  chip.classList.remove('done','err');
  if(state) chip.classList.add(state);
}
function setProgress(p){ $('#pbar').style.width = Math.max(0, Math.min(100,p)) + '%'; }
function prettyJSON(obj){ try{ return JSON.stringify(obj, null, 2);}catch{ return String(obj); } }
const pct = (n)=> (n<=1 ? Math.round(n*100) : Math.round(n)) + '%';

/* ---------- feedback + KPIs ---------- */
function renderFeedback(cards){
  const box = $('#feedback'); box.innerHTML = '';
  cards.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'card-item';
    el.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div style="font-weight:700">${c.title}</div>
        <span class="tag">${c.tag}</span>
      </div>
      <div class="small" style="margin-top:6px">${c.detail}</div>
      ${c.action?`<div class="row" style="margin-top:10px"><button class="btn secondary" onclick="alert('${c.action.replace(/'/g,"\\'")}')">Try Tip</button></div>`:''}
    `;
    box.appendChild(el);
  });
}
function updateKPIs({confidencePct,wpm,fillers}){
  $('#kpiConf').textContent = confidencePct!==undefined ? Math.round(confidencePct)+'%' : '—';
  $('#kpiWpm').textContent = wpm ?? '—';
  $('#kpiFillers').textContent = fillers ?? '—';
  $('#confPct').textContent = confidencePct!==undefined ? Math.round(confidencePct)+'%' : '—';
  $('#gfill').style.width = (confidencePct||0)+'%';
}

/* ---------- NEW: LLM response rendering ---------- */
function resetLLM(){
  $('#llmResponseText').textContent = '—';
  $('#llmWpm').textContent = '—';
  $('#llmAverage').textContent = '—';
  $('#llmMostUsedFiller').textContent = '—';
  $('#llmMostFiller').textContent = '—';
  $('#llmScore').textContent = '—';
}
function renderLLM(r){
  if(!r) return;
  // Support multiple key spellings safely
  const wpm = r.wpm ?? r.words_per_min ?? r.average ?? null;
  const avg = r.average ?? r.avg ?? null;
  const muf = r.most_used_filler ?? r.mostUsedFiller ?? null;
  const mf  = r.most_filler ?? r.mostFiller ?? null;
  const score = r.score ?? r.confidence ?? r.conf ?? null;

  $('#llmResponseText').textContent = r.response || '—';
  $('#llmWpm').textContent = (wpm!=null) ? String(wpm) : '—';
  $('#llmAverage').textContent = (avg!=null) ? String(avg) : '—';
  $('#llmMostUsedFiller').textContent = muf || '—';
  $('#llmMostFiller').textContent = (mf!=null) ? String(mf) : '—';
  $('#llmScore').textContent = (score!=null) ? (typeof score==='number' ? pct(score) : String(score)) : '—';
}

async function mockLLMSummary(/* file, transcript */){
  await sleep(350);
  return {
    response: "Nice structure and examples. Slow down slightly at transitions and reduce 'um'. Highlight quantifiable outcomes.",
    wpm: 134,
    average: 128,
    most_used_filler: "um",
    most_filler: 4,
    score: 0.82
  };
}
async function apiLLMSummaryUpload(file){
  const fd = new FormData();
  fd.append('file', file); // FastAPI: UploadFile = File(...)
  const res = await fetch(cfg.ENDPOINTS.llm, { method: 'POST', body: fd });
  if(!res.ok){
    const t = await res.text().catch(()=>res.statusText);
   // throw new Error(`LLM submit ${res.status}: ${t}`);
  }
  return res.json();
}

/* ---------- mock + API (speech) ---------- */
async function mockUpload(file){ await sleep(700); return { uploadId: 'upl_'+Math.random().toString(36).slice(2,8), durationSec: Math.min(60, Math.max(15, Math.floor(file.size/200000))) }; }
async function mockTranscribe(){ await sleep(900); return { transcript: `Thank you for meeting with me. I am excited about this role because I enjoy solving problems with users in mind. In my last project I led the front end and worked closely with the backend to ship a dashboard in two weeks. I keep answers concise and connect them to the job.` }; }
async function mockAnalyze(){ await sleep(700); const fillers = 3 + Math.floor(Math.random()*4); const wpm = 120 + Math.floor(Math.random()*30); const confidencePct = 62 + Math.floor(Math.random()*28); return { confidencePct, wpm, fillers, pitchVar: 0.72, ampVar: 0.65 }; }
async function mockFeedback(_, analysis){ await sleep(600); return { items: [ { title:'Clarity', tag:'Strong', detail:'Your answers are structured with a clear opening and a specific example. Keep connecting outcomes to impact.' }, { title:'Pacing', tag:'Could Improve', detail:'You averaged ~'+analysis.wpm+' words per minute. Aim for 110–130 wpm by pausing after key points.', action:'Practice 1-2-3 breathing before answers' }, { title:'Filler Words', tag:analysis.fillers+' used', detail:'Reduce “um/like” by rehearsing the first sentence of each answer.' }, { title:'Tone', tag:'Warm', detail:'Friendly and confident. Consider increasing pitch variation at transitions.' } ] }; }

async function apiUpload(file){ const fd = new FormData(); fd.append('file', file); const res = await fetch(cfg.ENDPOINTS.upload,{ method:'POST', body: fd }); if(!res.ok) throw new Error('Upload failed'); return res.json(); }
async function apiTranscribe(uploadId){ const res = await fetch(cfg.ENDPOINTS.transcribe,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId }) }); if(!res.ok) throw new Error('Transcription failed'); return res.json(); }
async function apiAnalyze(transcript){ const res = await fetch(cfg.ENDPOINTS.analyze,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transcript }) }); if(!res.ok) throw new Error('Analysis failed'); return res.json(); }
async function apiFeedback(transcript, analysis){ const res = await fetch(cfg.ENDPOINTS.feedback,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transcript, analysis }) }); if(!res.ok) throw new Error('Feedback failed'); return res.json(); }

/* ---------- upload/record UI ---------- */
let currentFile = null, lastAttempt = null, prevAttempt = null;

function reset(){
  currentFile = null;
  $('#player').src = '';
  $('#videoWrap').style.display='none';
  $('#meta').style.display='none';
  $('#processBtn').disabled=true;
  $('#resetBtn').disabled=true;
  setProgress(0);
  $$('#steps .chip').forEach(c=>c.classList.remove('done','err'));
  updateKPIs({confidencePct:undefined,wpm:undefined,fillers:undefined});
  $('#transcript').textContent='—';
  renderFeedback([]);
  resetLLM();                      // NEW
}

const drop = $('#drop'), fileInput = $('#file');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.remove('drag');}));
drop.addEventListener('drop',(e)=>{ const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); });
drop.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',()=>{ const f = fileInput.files?.[0]; if(f) handleFile(f); });

function handleFile(f){
  if(!f.type.startsWith('video/')){ alert('Please choose a video file.'); return; }
  if(f.size > 120*1024*1024){ alert('Please keep it under ~120MB'); return; }
  currentFile = f;
  const url = URL.createObjectURL(f);
  $('#player').src = url;
  $('#videoWrap').style.display = 'block';
  $('#meta').style.display = 'grid';
  $('#fname').textContent = 'Name: '+f.name;
  $('#fsize').textContent = 'Size: '+formatBytes(f.size);
  $('#processBtn').disabled = false;
  $('#resetBtn').disabled = false;
}

$('#resetBtn').addEventListener('click', reset);

$('#processBtn').addEventListener('click', async ()=>{
  if(!currentFile) return;
  resetLLM(); // clear old LLM
  try{
    setProgress(5);

    let up = cfg.USE_MOCK ? await mockUpload(currentFile) : await apiUpload(currentFile);
    setStepState(0,'done'); setProgress(30);

    let tx = cfg.USE_MOCK ? await mockTranscribe(up.uploadId) : await apiTranscribe(up.uploadId);
    $('#transcript').textContent = tx.transcript;
    setStepState(1,'done'); setProgress(55);

    let an = cfg.USE_MOCK ? await mockAnalyze(tx.transcript) : await apiAnalyze(tx.transcript);
    updateKPIs(an);
    setStepState(2,'done'); setProgress(78);

    let fb = cfg.USE_MOCK ? await mockFeedback(tx.transcript, an) : await apiFeedback(tx.transcript, an);
    renderFeedback(fb.items);
    setStepState(3,'done'); setProgress(100);

    // NEW: Call LLM summary endpoint (does not fail the whole pipeline if unavailable)
    try{
      const llm = cfg.USE_MOCK
        ? await mockLLMSummary(currentFile, tx.transcript)
        : await apiLLMSummaryUpload(currentFile);
      renderLLM(llm);
    }catch(e){
      console.warn('LLM summary failed:', e.message);
      $('#llmResponseText').textContent = 'LLM summary unavailable.';
    }

    prevAttempt = lastAttempt;
    lastAttempt = { when: new Date().toISOString(), transcript: tx.transcript, metrics: an };

  }catch(err){
    console.error(err);
    alert(err.message);
    $$('#steps .chip').forEach(c=>c.classList.add('err'));
    setProgress(0);
  }
});

/* ---------- copy buttons ---------- */
$('#copyBtn')?.addEventListener('click',async()=>{
  const t = $('#transcript').textContent;
  if(t && t !== '—'){ await navigator.clipboard.writeText(t); alert('Transcript copied'); }
});
$('#copyLlmBtn')?.addEventListener('click',async()=>{
  const t = $('#llmResponseText').textContent;
  if(t && t !== '—'){ await navigator.clipboard.writeText(t); alert('LLM response copied'); }
});

/* ---------- recording (robust) ---------- */
let recStream = null, mediaRecorder = null, recChunks = [], isRecording = false;
function pickMimeType(){
  const candidates = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  try{ if(window.MediaRecorder && MediaRecorder.isTypeSupported) return candidates.find(t=>MediaRecorder.isTypeSupported(t)) || ''; }
  catch(_){}
  return '';
}
async function startRecording(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert('Recording not supported in this browser. Use Chrome/Edge and run on https:// or localhost.'); return;
  }
  const btn = $('#recordBtn');
  try{
    btn.disabled = true;
    recStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    const mimeType = pickMimeType(); const options = mimeType ? { mimeType } : undefined;
    recChunks = []; mediaRecorder = new MediaRecorder(recStream, options);

    mediaRecorder.onstart = ()=>{ isRecording = true; btn.textContent = '■ Stop'; btn.disabled = false; };
    mediaRecorder.ondataavailable = e=>{ if(e.data && e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      isRecording = false; btn.textContent = '● Record';
      try{
        const blob = new Blob(recChunks, { type: mimeType || 'video/webm' });
        const file = new File([blob], 'recording.webm', { type: mimeType || 'video/webm' });
        handleFile(file);
      }catch(err){ alert('Could not create recording file: ' + err.message); }
      finally{ if(recStream){ recStream.getTracks().forEach(t=>t.stop()); recStream=null; } }
    };

    mediaRecorder.start();
    setTimeout(()=>{ if(mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop(); }, 60000);
  }catch(err){
    btn.disabled=false;
    if(recStream){ recStream.getTracks().forEach(t=>t.stop()); recStream=null; }
    alert('Camera/mic permission denied or unavailable: ' + err.message);
  }
}
function stopRecording(){
  if(mediaRecorder && mediaRecorder.state!=='inactive') mediaRecorder.stop();
  if(recStream){ recStream.getTracks().forEach(t=>t.stop()); recStream=null; }
}
$('#recordBtn')?.addEventListener('click', ()=>{ if(isRecording) stopRecording(); else startRecording(); });

/* ---------- JS Coding Practice + Backend Judge (unchanged from previous) ---------- */
/* ... (your existing Coding Practice + Judge + Pyodide sections remain exactly as before) ...
   For brevity, keep those blocks as you already have them in your project. */

/* ---------- API Playground (unchanged) ---------- */
/* If you already have this in your app.js from earlier, keep it as-is.
   Otherwise you can paste the API Playground code block from the last message here. */

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const t = $('#toggleMock');
  t.textContent = cfg.USE_MOCK ? 'Use Real API' : 'Use Mock API';
  t.classList.toggle('secondary', cfg.USE_MOCK);
  resetLLM();
});
$('#toggleMock').addEventListener('click',()=>{
  cfg.USE_MOCK = !cfg.USE_MOCK;
  const t = $('#toggleMock');
  t.textContent = cfg.USE_MOCK ? 'Use Real API' : 'Use Mock API';
  t.classList.toggle('secondary', cfg.USE_MOCK);
});
