// Coach Prep – app.js (with Backend Judge + API Playground)
const cfg = {
  USE_MOCK: true,
  ENDPOINTS: {
    upload: '/api/upload',
    transcribe: '/api/transcribe',
    analyze: '/api/analyze',
    feedback: '/api/feedback',
    judge: '/api/judge'
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

    prevAttempt = lastAttempt;
    lastAttempt = { when: new Date().toISOString(), transcript: tx.transcript, metrics: an };

  }catch(err){
    console.error(err);
    alert(err.message);
    $$('#steps .chip').forEach(c=>c.classList.add('err'));
    setProgress(0);
  }
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

/* ---------- JS coding practice (local runner) ---------- */
const problems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    fn: 'twoSum',
    prompt:
`Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.
Return [i, j] with i < j. Assume exactly one solution exists.

Example:
  nums = [2,7,11,15], target = 9  -> [0,1]`,
    starter:
`// You can write sync *or* async implementations.
function twoSum(nums, target){
  const map = new Map();
  for(let i=0;i<nums.length;i++){
    const need = target - nums[i];
    if(map.has(need)) return [map.get(need), i];
    map.set(nums[i], i);
  }
}`,
    baseTests: [
      { input: [[2,7,11,15], 9], expect: [0,1] },
      { input: [[3,2,4], 6], expect: [1,2] },
      { input: [[3,3], 6], expect: [0,1] }
    ],
    gen(n){
      const tests = [];
      for(let k=0;k<n;k++){
        const len = 5 + Math.floor(Math.random()*6);
        const nums = Array.from({length:len},()=>Math.floor(Math.random()*30)-5);
        const i = Math.floor(Math.random()*len);
        let j = Math.floor(Math.random()*len);
        if(j===i) j = (j+1)%len;
        const target = nums[i] + nums[j];
        const ii = Math.min(i,j), jj = Math.max(i,j);
        tests.push({ input:[nums, target], expect:[ii, jj] });
      }
      return tests;
    }
  }
];

let currentProblem = null;
let submissionHistory = [];
let attemptsLeft = RUN_CFG.maxAttempts;

const problemSelect = $('#problemSelect');
const problemTitle  = $('#problemTitle');
const problemPrompt = $('#problemPrompt');
const editorEl      = $('#editor');
const fnNameEl      = $('#fnName');
const runBtn        = $('#runBtn');
const submitBtn     = $('#submitBtn');
const resetCodeBtn  = $('#resetCode');
const verdictEl     = $('#verdict');
const resultsEl     = $('#results');
const testCountSel  = $('#testCount');
const randomizeCb   = $('#randomizeCb');
const attemptsLeftEl= $('#attemptsLeft');
const historyListEl = $('#historyList');
const useServerJudgeCb = $('#useServerJudgeCb');
const serverStatusEl = $('#serverStatus');
const langSel       = $('#langSelect');

function deepEqual(a,b){
  if(a===b) return true;
  if(typeof a!==typeof b) return false;
  if(Array.isArray(a) && Array.isArray(b)){
    if(a.length!==b.length) return false;
    for(let i=0;i<a.length;i++){ if(!deepEqual(a[i], b[i])) return false; }
    return true;
  }
  if(a && b && typeof a==='object'){
    const ka = Object.keys(a), kb = Object.keys(b);
    if(ka.length!==kb.length) return false;
    for(const k of ka){ if(!deepEqual(a[k], b[k])) return false; }
    return true;
  }
  return false;
}
const timeout = (ms)=> new Promise((_,rej)=> setTimeout(()=>rej(new Error(`Timeout after ${ms}ms`)), ms));
const now = ()=> performance.now();

function renderResults(rows, mount){
  const target = mount || resultsEl;
  target.innerHTML = '';
  rows.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'test-row';
    const badgeClass = r.err ? 'error' : (r.ok ? 'pass' : 'fail');
    const inputPreview = JSON.stringify(r.input);
    div.innerHTML = `
      <div class="mono">#${(r.idx ?? r.index)+1} (${r.ms ?? r.timeMs ?? 0}ms)</div>
      <div class="small mono">in: ${inputPreview && inputPreview.length>64 ? inputPreview.slice(0,64)+'…' : inputPreview}</div>
      <div class="small mono">out: ${JSON.stringify(r.out ?? r.actual)}</div>
      <div class="small mono">exp: ${JSON.stringify(r.exp ?? r.expected)}</div>
      <div class="badge ${badgeClass}">${r.err || r.error ? 'Error' : ((r.ok ?? r.passed) ? 'Pass' : 'Fail')}</div>
    `;
    target.appendChild(div);
    const errMsg = r.err || r.error;
    if(errMsg){
      const e = document.createElement('div');
      e.className = 'small mono'; e.style.color = '#ffb3b3'; e.style.margin = '4px 0 0 0';
      e.textContent = '   ↳ ' + errMsg; target.appendChild(e);
    }
  });
}

function setVerdict(passed, total, hadError, mount){
  const v = mount || verdictEl;
  v.classList.remove('pass','fail');
  const text = hadError ? `Verdict: Error (${passed}/${total} passed)` :
               (passed===total ? `Verdict: Pass (${passed}/${total})` :
                                 `Verdict: Fail (${passed}/${total})`);
  v.textContent = text;
  v.classList.add(hadError ? 'fail' : (passed===total ? 'pass' : 'fail'));
}
function setServerStatus(text, ok){
  serverStatusEl.style.display = 'block';
  serverStatusEl.classList.remove('status-ok','status-err');
  serverStatusEl.classList.add(ok ? 'status-ok' : 'status-err');
  serverStatusEl.textContent = text;
}

function loadProblem(id){
  currentProblem = problems.find(p=>p.id===id);
  problemTitle.textContent = currentProblem.title;
  problemPrompt.textContent = currentProblem.prompt;
  fnNameEl.textContent = currentProblem.fn + '(...)';
  editorEl.value = currentProblem.starter;
  verdictEl.textContent = 'Verdict: —';
  verdictEl.classList.remove('pass','fail');
  resultsEl.innerHTML = '';
  serverStatusEl.style.display = 'none';
  submissionHistory = [];
  attemptsLeft = RUN_CFG.maxAttempts;
  attemptsLeftEl.textContent = attemptsLeft;
  historyListEl.innerHTML = '';
}
function initProblems(){
  problemSelect.innerHTML = problems.map(p=>`<option value="${p.id}">${p.title}</option>`).join('');
  loadProblem(problems[0].id);
}

function buildTests(){
  const n = parseInt(testCountSel.value, 10) || 6;
  let tests = [];
  const base = currentProblem.baseTests ?? [];
  const basePick = Math.min(base.length, 2);
  for(let i=0;i<basePick;i++) tests.push(base[i]);

  if(randomizeCb.checked && typeof currentProblem.gen==='function'){
    const remaining = Math.max(0, n - tests.length);
    tests = tests.concat(currentProblem.gen(remaining));
  } else {
    for(let i=tests.length;i<n && i<base.length;i++) tests.push(base[i]);
    while(tests.length < n && base.length){ tests.push(base[tests.length % base.length]); }
  }
  return tests;
}
function getUserFunction(){
  const code = editorEl.value;
  const wrapper = new Function(code + `; return typeof ${currentProblem.fn}==='function' ? ${currentProblem.fn} : null;`);
  const fn = wrapper();
  if(typeof fn !== 'function'){ throw new Error(`Function '${currentProblem.fn}' not found. Make sure to define it.`); }
  return fn;
}
async function runOne(userFn, test, idx){
  const t0 = now();
  try{
    const out = await Promise.race([ Promise.resolve(userFn(...test.input)), timeout(RUN_CFG.timeoutMs) ]);
    const ok  = deepEqual(out, test.expect);
    return { idx, input:test.input, out, exp:test.expect, ok, err:null, ms: Math.max(1, Math.round(now()-t0)) };
  }catch(e){
    return { idx, input:test.input, out:null, exp:test.expect, ok:false, err:e.message, ms: Math.max(1, Math.round(now()-t0)) };
  }
}
async function runSuiteLocal(){
  let userFn;
  try{
    userFn = getUserFunction();
  }catch(err){
    setVerdict(0, 0, true);
    renderResults([{ idx:0, input:null, out:null, exp:null, ok:false, err: err.message, ms:0 }]);
    return { passed:0, total:0, hadError:true, rows:[] , timeMs:0, compilationError: err.message };
  }
  const tests = buildTests();
  const rows = [];
  let passed = 0, hadError = false, totalTime = 0;

  for(let i=0;i<tests.length;i++){
    const r = await runOne(userFn, tests[i], i);
    rows.push(r);
    if(r.ok) passed++; else if(r.err) hadError = true;
    totalTime += r.ms;
  }
  setVerdict(passed, tests.length, hadError);
  renderResults(rows);
  return { passed, total: tests.length, hadError, rows, timeMs: totalTime, compilationError: null };
}

/* ---------- Backend Judge integration ---------- */
async function apiJudge({ problemId, language, code, testCount, randomize }){
  const res = await fetch(cfg.ENDPOINTS.judge, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ problemId, language, code, testCount, randomize })
  });
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Judge API ${res.status}: ${txt}`);
  }
  return res.json();
}
async function mockJudge({ problemId, language, code, testCount, randomize }){
  let fn;
  try{
    fn = new Function(code + `; return typeof ${currentProblem.fn}==='function' ? ${currentProblem.fn} : null;`)();
    if(typeof fn !== 'function') throw new Error(`Function '${currentProblem.fn}' not found.`);
  }catch(err){
    await sleep(300);
    return {
      attemptId: 'att_'+Math.random().toString(36).slice(2,8),
      status: 'compilation_error',
      compilerError: err.message,
      results: [],
      summary: { passed:0, total:0, timeMs:0 }
    };
  }
  const tests = buildTests();
  const rows = [];
  let passed = 0, totalTime = 0, hadError = false;

  for(let i=0;i<tests.length;i++){
    const t0 = now();
    try{
      const out = await Promise.resolve(fn(...tests[i].input));
      const ok = deepEqual(out, tests[i].expect);
      if(ok) passed++;
      rows.push({ index:i, input:tests[i].input, expected:tests[i].expect, actual:out, passed:ok, timeMs: Math.max(1, Math.round(now()-t0)), error:null });
      totalTime += rows[rows.length-1].timeMs;
    }catch(e){
      hadError = true;
      rows.push({ index:i, input:tests[i].input, expected:tests[i].expect, actual:null, passed:false, timeMs: Math.max(1, Math.round(now()-t0)), error: e.message });
      totalTime += rows[rows.length-1].timeMs;
    }
  }
  await sleep(300);
  return {
    attemptId: 'att_'+Math.random().toString(36).slice(2,8),
    status: hadError ? 'error' : (passed===tests.length ? 'passed' : 'failed'),
    compilerError: null,
    results: rows,
    summary: { passed, total: tests.length, timeMs: totalTime }
  };
}
function renderJudgeResponse(resp){
  const ok = resp.status === 'passed';
  if(resp.compilerError){
    setServerStatus(`Attempt ${resp.attemptId} • status=compilation_error • ${resp.compilerError}`, false);
  }else{
    setServerStatus(`Attempt ${resp.attemptId} • status=${resp.status} • ${resp.summary.passed}/${resp.summary.total} passed • ${resp.summary.timeMs}ms`, ok);
  }
  const rows = resp.results.map(r=>({
    idx: r.index, input: r.input, out: r.actual, exp: r.expected,
    ok: !!r.passed, err: r.error || null, ms: r.timeMs
  }));
  const hadError = resp.status==='error' || resp.status==='compilation_error' || rows.some(r=>r.err);
  setVerdict(resp.summary.passed, resp.summary.total, hadError);
  renderResults(rows);
}

/* ---------- JS panel events ---------- */
function renderHistory(){
  historyListEl.innerHTML = '';
  submissionHistory.forEach(h=>{
    const div = document.createElement('div');
    const cls = h.hadError ? 'fail' : (h.passed===h.total ? 'pass' : 'fail');
    div.className = 'attempt-card';
    div.innerHTML = `
      <div class="badge ${cls}">${h.hadError ? 'Error' : (h.passed===h.total ? 'Pass' : 'Fail')}</div>
      <div class="summary">${h.passed}/${h.total} tests</div>
      <div class="ms">⏱ ${h.timeMs}ms</div>
      <div class="stamp">${new Date(h.when).toLocaleTimeString()}</div>
    `;
    historyListEl.appendChild(div);
  });
}
function handleRunClick(){
  if(useServerJudgeCb.checked){
    serverStatusEl.style.display = 'none';
    const payload = {
      problemId: currentProblem.id,
      language: (langSel?.value || 'javascript'),
      code: editorEl.value,
      testCount: parseInt(testCountSel.value,10)||6,
      randomize: !!randomizeCb.checked
    };
    const runner = cfg.USE_MOCK ? mockJudge : apiJudge;
    return runner(payload)
      .then(resp => renderJudgeResponse(resp))
      .catch(err => {
        setServerStatus(`Judge request failed: ${err.message}`, false);
        verdictEl.classList.remove('pass'); verdictEl.classList.add('fail');
        verdictEl.textContent = 'Verdict: Error';
        resultsEl.innerHTML = '';
      });
  } else {
    serverStatusEl.style.display = 'none';
    return runSuiteLocal();
  }
}
function handleSubmitClick(){
  if(attemptsLeft <= 0){ alert('No attempts left. (Max 3)'); return; }
  if(useServerJudgeCb.checked){
    const payload = {
      problemId: currentProblem.id,
      language: (langSel?.value || 'javascript'),
      code: editorEl.value,
      testCount: parseInt(testCountSel.value,10)||6,
      randomize: !!randomizeCb.checked
    };
    const runner = cfg.USE_MOCK ? mockJudge : apiJudge;
    runner(payload).then(resp=>{
      renderJudgeResponse(resp);
      submissionHistory.unshift({
        passed: resp.summary.passed, total: resp.summary.total,
        timeMs: resp.summary.timeMs, hadError: resp.status!=='passed' && resp.status!=='failed' ? true : (resp.status==='error' || resp.status==='compilation_error'),
        when: new Date().toISOString()
      });
      submissionHistory = submissionHistory.slice(0, RUN_CFG.maxAttempts);
      attemptsLeft = Math.max(0, attemptsLeft - 1);
      attemptsLeftEl.textContent = attemptsLeft.toString();
      renderHistory();
    }).catch(err=>{
      setServerStatus(`Judge request failed: ${err.message}`, false);
    });
  } else {
    runSuiteLocal().then(res=>{
      submissionHistory.unshift({ passed:res.passed, total:res.total, timeMs:res.timeMs, hadError:res.hadError, when:new Date().toISOString() });
      submissionHistory = submissionHistory.slice(0, RUN_CFG.maxAttempts);
      attemptsLeft = Math.max(0, attemptsLeft - 1);
      attemptsLeftEl.textContent = attemptsLeft.toString();
      renderHistory();
    });
  }
}
problemSelect?.addEventListener('change', (e)=> loadProblem(e.target.value));
resetCodeBtn?.addEventListener('click', ()=> loadProblem(currentProblem.id));
runBtn?.addEventListener('click', handleRunClick);
submitBtn?.addEventListener('click', handleSubmitClick);

/* ---------- Python Practice (Pyodide) ---------- */
const PY_DEFAULT = String.raw`# Problem harness for Two Sum
NAME = "Two Sum"
OUTLINE = (
    "Given an integer array nums and an integer target, "
    "return the indices [i, j] (i < j) such that nums[i] + nums[j] == target. "
    "Assume exactly one valid answer exists."
)
def solution(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            j = i
            i = seen[need]
            return [i, j] if i < j else [j, i]
        seen[x] = i
    return None
def default_tests():
    return [
        {"nums": [2, 7, 11, 15], "target": 9, "expect": [0, 1]},
        {"nums": [3, 2, 4], "target": 6, "expect": [1, 2]},
        {"nums": [3, 3], "target": 6, "expect": [0, 1]},
    ]
def run_tests(tests):
    results = []
    for t in tests:
        nums = t.get("nums", [])
        target = t.get("target")
        exp = t.get("expect", None)
        try:
            out = solution(nums, target)
            ok = (exp is None) or (out == exp)
            results.append({"input":{"nums":nums,"target":target},"output":out,"expect":exp,"ok":ok})
        except Exception as e:
            results.append({"input":{"nums":nums,"target":target},"error":str(e),"expect":exp,"ok":False})
    return results
`;
const pyNameEl = $('#pyName'), pyOutlineEl = $('#pyOutline'), pyEditor = $('#pyEditor');
const runPyBtn = $('#runPyBtn'), pyTestsEl = $('#pyTests'), pyVerdictEl = $('#pyVerdict');
const pyResultsEl = $('#pyResults'), pyRawEl = $('#pyRaw');
let pyodide = null;
async function ensurePyodide(){
  if(pyodide) return pyodide;
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full' });
  return pyodide;
}
function buildPythonProgram(userCode, customJson){
  const jsonLiteral = (customJson || '').replace(/`/g, '\\`');
  return String.raw`
import json
${userCode}
if 'NAME' not in globals(): NAME = "Two Sum"
if 'OUTLINE' not in globals(): OUTLINE = "Given an integer array nums and an integer target, return indices [i,j] (i < j) where nums[i] + nums[j] == target. Assume exactly one valid answer exists."
missing_default = 'default_tests' not in globals()
missing_run     = 'run_tests' not in globals()
if missing_default or missing_run:
${PY_DEFAULT.split('\n').map(l=>'    '+l).join('\n')}
_ui = """${jsonLiteral}"""
def _load_from_ui():
    try:
        s = _ui.strip()
        if not s: return None
        data = json.loads(s)
        if isinstance(data, dict) and 'tests' in data and isinstance(data['tests'], list): return data['tests']
        if isinstance(data, dict) and 'nums' in data and 'target' in data: return [data]
    except Exception: pass
    return None
tests = _load_from_ui() or default_tests()
results = run_tests(tests)
payload = {"name": NAME, "outline": OUTLINE, "results": results}
json.dumps(payload)
`; }
function renderPyResults(payload){
  pyRawEl.textContent = JSON.stringify(payload, null, 2);
  const rows = []; let pass=0, total=0, hadError=false;
  payload.results.forEach((r, idx)=>{
    const ok = !!r.ok; if(ok) pass++; else if(r.error) hadError = true; total++;
    rows.push({ idx, input:r.input, out:('output' in r)?r.output:null, exp:r.expect, ok, err:r.error||null, ms:0 });
  });
  setVerdict(pass, total, hadError, pyVerdictEl);
  renderResults(rows, pyResultsEl);
}
runPyBtn?.addEventListener('click', async()=>{
  try{
    runPyBtn.disabled = true; runPyBtn.textContent = 'Running…';
    await ensurePyodide();
    const program = buildPythonProgram(pyEditor.value, pyTestsEl.value);
    const out = await pyodide.runPythonAsync(program);
    const payload = JSON.parse(out);
    pyNameEl.textContent = payload.name || 'Two Sum';
    pyOutlineEl.textContent = payload.outline || '';
    renderPyResults(payload);
  }catch(err){
    pyVerdictEl.classList.remove('pass'); pyVerdictEl.classList.add('fail');
    pyVerdictEl.textContent = 'Verdict: Error';
    pyResultsEl.innerHTML = '';
    pyRawEl.textContent = 'Runtime error:\n' + (err && err.message ? err.message : String(err));
  }finally{
    runPyBtn.disabled = false; runPyBtn.textContent = 'Run Python';
  }
});

/* ---------- API PLAYGROUND ---------- */
/**
 * Generic API caller. Honors cfg.USE_MOCK for safe demos.
 * @param {Object} opts
 * @param {string} opts.endpoint - relative path (/api/health) or full URL
 * @param {string} [opts.method='GET']
 * @param {Object} [opts.headers]
 * @param {any}    [opts.body] - JS object; will be JSON.stringified for non-GET
 */
async function fetchDataFromAPI({ endpoint, method='GET', headers={}, body }){
  if(cfg.USE_MOCK){
    // Simulated response for demos
    await sleep(350);
    return {
      ok: true,
      status: 200,
      headers: { 'content-type':'application/json' },
      data: {
        mock: true,
        message: 'Mock response (toggle Use Real API to hit your backend).',
        echo: { endpoint, method, body },
        timestamp: new Date().toISOString()
      }
    };
  }

  const opts = { method, headers: { ...headers } };
  if(method !== 'GET' && method !== 'HEAD'){
    if(body !== undefined){
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      if(!opts.headers['Content-Type'] && !(opts.headers['content-type']))
        opts.headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(endpoint, opts);
  let data;
  const ctype = res.headers.get('content-type') || '';
  if(ctype.includes('application/json')){
    data = await res.json();
  } else {
    data = await res.text();
  }
  if(!res.ok){
    const err = new Error(`HTTP ${res.status}`);
    err.response = data;
    throw err;
  }
  return { ok:true, status:res.status, headers:Object.fromEntries(res.headers.entries()), data };
}

// Wire up the playground UI
const apiEndpointEl = $('#apiEndpoint');
const apiMethodEl   = $('#apiMethod');
const apiAuthEl     = $('#apiAuth');
const apiBodyEl     = $('#apiBody');
const apiCallBtn    = $('#apiCallBtn');
const apiStatusEl   = $('#apiStatus');
const apiOutputEl   = $('#apiOutput');

function setApiStatus(text, ok=true){
  apiStatusEl.textContent = text;
  apiStatusEl.classList.remove('status-ok','status-err');
  apiStatusEl.classList.add(ok ? 'status-ok' : 'status-err');
}

apiCallBtn?.addEventListener('click', async ()=>{
  try{
    setApiStatus('Calling…', true);
    const endpoint = apiEndpointEl.value.trim();
    const method   = apiMethodEl.value;
    const auth     = apiAuthEl.value.trim();

    let bodyObj;
    const raw = apiBodyEl.value.trim();
    if(raw){
      try{ bodyObj = JSON.parse(raw); }
      catch{ throw new Error('Body is not valid JSON'); }
    }

    const headers = {};
    if(auth) headers['Authorization'] = auth;

    const resp = await fetchDataFromAPI({ endpoint, method, headers, body: bodyObj });
    setApiStatus(`${resp.status} OK`, true);
    apiOutputEl.textContent = prettyJSON(resp.data);
  }catch(err){
    setApiStatus(err.message || 'Request failed', false);
    const extra = err.response ? `\n\nResponse:\n${prettyJSON(err.response)}` : '';
    apiOutputEl.textContent = `Error calling API: ${err.message}${extra}`;
  }
});

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const t = $('#toggleMock');
  t.textContent = cfg.USE_MOCK ? 'Use Real API' : 'Use Mock API';
  t.classList.toggle('secondary', cfg.USE_MOCK);
  if($('#codeSection')) initProblems();
  if($('#pySection')) $('#pyEditor').value = PY_DEFAULT;
});
$('#toggleMock').addEventListener('click',()=>{
  cfg.USE_MOCK = !cfg.USE_MOCK;
  const t = $('#toggleMock');
  t.textContent = cfg.USE_MOCK ? 'Use Real API' : 'Use Mock API';
  t.classList.toggle('secondary', cfg.USE_MOCK);
});
$('#copyBtn')?.addEventListener('click',async()=>{
  const t = $('#transcript').textContent;
  if(t && t !== '—'){ await navigator.clipboard.writeText(t); alert('Transcript copied'); }
});
$('#compareBtn')?.addEventListener('click',()=>{
  if(!lastAttempt || !prevAttempt){ alert('Record at least two attempts to compare.'); return; }
  const out = $('#compareOut'); out.style.display='block';
  out.innerHTML = `
    <div class="mono">Previous → Recent</div>
    <div style="margin-top:8px">
      <div><b>Confidence:</b> ${Math.round(prevAttempt.metrics.confidencePct)}% → ${Math.round(lastAttempt.metrics.confidencePct)}%</div>
      <div><b>WPM:</b> ${prevAttempt.metrics.wpm} → ${lastAttempt.metrics.wpm}</div>
      <div><b>Fillers:</b> ${prevAttempt.metrics.fillers} → ${lastAttempt.metrics.fillers}</div>
    </div>
  `;
});
