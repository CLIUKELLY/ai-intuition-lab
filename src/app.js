import { concepts } from './catalog.js';
import { detail } from './content.js';
import { mountSimulation, simulationState, redraw, drawTeaser } from './simulations.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const sessions = new Map();
let saved = [], filter = 'All', view = 'library', current = null, tab = 'Intuition';
try {
  const stored = JSON.parse(localStorage.getItem('intuition-saved') || '[]');
  if (Array.isArray(stored)) saved = stored.filter(id => concepts.some(c => c.id === id));
} catch { /* Storage is optional. */ }

function persist() {
  try { localStorage.setItem('intuition-saved', JSON.stringify(saved)); } catch { /* Private browsing may disable persistence. */ }
  $('#saveCount').textContent = saved.length;
}
function toggleSave(id) {
  saved = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
  persist();
}
function renderCards() {
  const query = $('#search').value.toLowerCase();
  const list = concepts.filter(c => (filter === 'All' || c.category === filter) && (view !== 'saved' || saved.includes(c.id)) && `${c.title} ${c.category} ${c.desc}`.toLowerCase().includes(query));
  $('#cards').innerHTML = list.map(c => `<article class="card"><button class="card-open" data-id="${c.id}" aria-label="Open ${c.title}"><div class="card-visual" style="background:${c.color}"><span class="card-type">${c.type}</span>${mini(c.id)}</div><div class="card-body"><span class="card-category">${c.category}</span><h3>${c.title}</h3><p>${c.desc}</p></div></button><div class="card-bottom"><span class="${c.live ? 'live' : ''}">${c.live ? '● Live experiment' : '◌ Concept preview'} · ${c.time}</span><button class="bookmark" data-save="${c.id}" aria-label="${saved.includes(c.id) ? 'Unsave' : 'Save'} ${c.title}" aria-pressed="${saved.includes(c.id)}">${saved.includes(c.id) ? '◆' : '◇'}</button></div></article>`).join('') || '<div class="empty">No experiments found. Try a different search or category.</div>';
  $$('[data-id]').forEach(button => button.onclick = () => openLab(button.dataset.id));
  $$('[data-save]').forEach(button => button.onclick = () => { toggleSave(button.dataset.save); renderCards(); });
}
function showView(next, updateHistory = true) {
  if (current && concepts.find(c => c.id === current)?.live) sessions.set(current, simulationState());
  view = next; current = null;
  $('#lab').hidden = true; $('#paths').hidden = next !== 'paths'; $('#library').hidden = next === 'paths';
  $('.hero').hidden = next === 'saved'; $('.featured').hidden = next === 'saved';
  $('#sectionTitle').textContent = next === 'saved' ? 'Your saved experiments.' : 'A library of aha moments.';
  $('#sectionSub').textContent = next === 'saved' ? 'Keep the ideas you want to return to.' : 'Small ideas. Powerful connections. Pick something you’re curious about.';
  $('#breadcrumb').textContent = `Workspace / ${next === 'paths' ? 'Learning paths' : next === 'saved' ? 'Saved' : 'Explore'}`;
  $$('.nav').forEach(button => button.classList.toggle('active', button.dataset.view === next));
  if (next === 'paths') renderPaths(); else renderCards();
  if (updateHistory) history.pushState(null, '', `#${next}`);
  requestAnimationFrame(resize);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setFilter(next) {
  filter = next; showView('library');
  $$('#filters button').forEach(button => button.classList.toggle('selected', button.dataset.filter === next));
  $('#sectionTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function experimentHash(id, state) {
  const params = new URLSearchParams();
  if (state) params.set('state', JSON.stringify(state));
  return `#lab/${id}${state ? '?' + params : ''}`;
}
function updateExperimentURL(state) {
  sessions.set(current, state);
  history.replaceState(null, '', experimentHash(current, state));
  if ($('#shareURL')) $('#shareURL').value = location.href;
}
function openLab(id, restored, updateHistory = true) {
  const concept = concepts.find(c => c.id === id);
  if (!concept) return;
  if (current && concepts.find(c => c.id === current)?.live) sessions.set(current, simulationState());
  current = id; tab = 'Intuition';
  $('#library').hidden = true; $('#paths').hidden = true; $('#lab').hidden = false;
  $('#breadcrumb').textContent = `Library / ${concept.category} / ${concept.type.toLowerCase()}`;
  $('#lab').innerHTML = `<div class="lab-top"><button class="back" id="back">← Back to the library</button><div class="lab-actions"><button class="secondary" id="share">↗ Share this experiment</button><button class="secondary" id="saveLab" aria-pressed="${saved.includes(id)}">${saved.includes(id) ? '◆ Saved' : '◇ Save experiment'}</button></div></div><div id="sharePanel" class="share-panel" hidden><label for="shareURL">This link restores your settings${id === 'overfit' ? ' and edited training points' : ''}.</label><input id="shareURL" readonly><button id="copyURL" class="secondary">Copy link</button><span id="copyStatus" role="status"></span></div><div class="lab-intro"><div class="eyebrow">${concept.category.toUpperCase()} / ${concept.type}</div><h1>${concept.title}</h1><p>${descriptions[id] || concept.desc}</p></div><div id="simulation">${concept.live ? '' : previewHTML(id)}</div><div class="details"><div class="detail-tabs" role="tablist" aria-label="Explanation layers">${['Intuition', 'The math', 'In practice', 'Connections'].map(t => `<button role="tab" tabindex="${t === tab ? 0 : -1}" aria-selected="${t === tab}" data-tab="${t}" class="${t === tab ? 'active' : ''}">${t}</button>`).join('')}</div><div class="detail-content" id="detailContent" role="tabpanel"></div></div>`;
  if (updateHistory) history.pushState(null, '', experimentHash(id));
  if (concept.live) {
    mountSimulation($('#simulation'), id, restored || sessions.get(id) || {}, updateExperimentURL);
    updateExperimentURL(simulationState());
  }
  $('#back').onclick = () => showView('library');
  $('#saveLab').onclick = () => { toggleSave(id); $('#saveLab').textContent = saved.includes(id) ? '◆ Saved' : '◇ Save experiment'; $('#saveLab').setAttribute('aria-pressed', saved.includes(id)); };
  $('#share').onclick = () => { $('#sharePanel').hidden = !$('#sharePanel').hidden; $('#shareURL').value = location.href; };
  $('#copyURL').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); $('#copyStatus').textContent = 'Copied! Send someone your aha moment.'; }
    catch { $('#shareURL').select(); $('#copyStatus').textContent = 'Select and copy the link above.'; }
  };
  $$('[data-tab]').forEach(button => button.onclick = () => {
    tab = button.dataset.tab;
    $$('[data-tab]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-selected', item === button); item.tabIndex = item === button ? 0 : -1; });
    renderDetail();
  });
  const tabs = $$('[data-tab]');
  tabs.forEach((button, index) => button.onkeydown = event => {
    const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (event.key in keys) { event.preventDefault(); tabs[keys[event.key]].click(); tabs[keys[event.key]].focus(); }
  });
  renderDetail(); requestAnimationFrame(redraw);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function route() {
  const [path, query] = location.hash.slice(1).split('?');
  if (path.startsWith('lab/')) {
    const id = path.slice(4);
    if (concepts.some(c => c.id === id)) {
      let restored;
      try { const raw = new URLSearchParams(query).get('state'); if (raw && raw.length < 12000) restored = JSON.parse(raw); } catch { /* Fall back to default settings for invalid links. */ }
      openLab(id, restored && typeof restored === 'object' && !Array.isArray(restored) ? restored : undefined, false);
      return;
    }
  }
  showView(['paths', 'saved'].includes(path) ? path : 'library', false);
}
function resize() {
  if (!$('#library').hidden && !$('.featured').hidden) drawTeaser();
  if (current) redraw();
}
$$('.nav').forEach(button => button.onclick = () => showView(button.dataset.view));
$$('[data-filter]').forEach(button => button.onclick = () => setFilter(button.dataset.filter));
$('#search').oninput = renderCards;
$('.brand').onclick = event => { event.preventDefault(); setFilter('All'); };
$('#start').onclick = $('#featuredOpen').onclick = () => openLab('overfit');
$('#about').onclick = () => $('#info').showModal();
$('#teaserRange').oninput = drawTeaser;
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); showView('library'); $('#search').focus(); }
});
window.addEventListener('resize', resize);
window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);
window.openLab = openLab;
persist();
function mini(id){let marks='';if(id==='overfit'){for(let i=0;i<15;i++){let x=35+i*15,y=65-27*Math.sin(i*.43)+Math.sin(i*7)*10;marks+=`<circle cx="${x}" cy="${y}" r="3" fill="#8997b9"/>`}marks+='<path d="M25 90 Q70 5 120 57 T210 75 T270 34" stroke="#6c7caa" fill="none" stroke-width="2"/>'}if(id==='outliers'){[45,62,77,91,107,123,141,158,235].forEach((x,i)=>marks+=`<circle cx="${x}" cy="70" r="${i===8?7:5}" fill="${i===8?'#cf9a61':'#bdb5a0'}"/>`);marks+='<path d="M118 41v59" stroke="#b68146" stroke-dasharray="3 3"/><path d="M25 85H273" stroke="#e0d7c7"/>'}if(id==='threshold'){for(let i=0;i<25;i++)marks+=`<circle cx="${30+i*10}" cy="${50+Math.sin(i*13)*20}" r="4" fill="${i<12?'#9eb89a':'#d5ae89'}" opacity=".8"/>`;marks+='<path d="M150 30v72" stroke="#64855c" stroke-width="2"/>'}if(id==='vectors'){for(let i=0;i<30;i++)marks+=`<circle cx="${70+Math.sin(i*5)*30+(i%2)*125}" cy="${65+Math.cos(i*7)*26}" r="3" fill="${i%2?'#7da9b7':'#b4bdc1'}"/>`;marks+='<path d="M90 85l93-30" stroke="#71a4b4" stroke-dasharray="4 4"/>'}if(id==='attention'){for(let i=0;i<5;i++){for(let j=0;j<5;j++)marks+=`<path d="M${50+i*50} 35L${50+j*50} 88" stroke="#a79bbf" opacity="${i===j?.7:.12}"/>`;marks+=`<rect x="${36+i*50}" y="25" width="28" height="15" rx="4" fill="#b5a9ca"/><rect x="${36+i*50}" y="87" width="28" height="15" rx="4" fill="#d6d0e2"/>`}}if(id==='rag'){marks='<path d="M50 65H250" stroke="#b3c19e" stroke-dasharray="4 4"/>';[40,110,180,250].forEach((x,i)=>marks+=`<rect x="${x-16}" y="47" width="32" height="36" rx="5" fill="${i===3?'#77905e':'#dde6cf'}" stroke="#c4d2b4"/><text x="${x}" y="70" text-anchor="middle" fill="${i===3?'white':'#82936d'}" font-size="15">${['?','▤','⌕','✓'][i]}</text>`)}return `<svg viewBox="0 0 300 125" aria-hidden="true">${marks}</svg>`}

function renderPaths(){$('#paths').innerHTML='<div class="lab-intro"><div class="eyebrow" style="margin-top:40px">FOLLOW YOUR CURIOSITY</div><h1>A few ideas, connected.</h1><p>Build understanding one experiment at a time. Each path begins with something you can try.</p></div>'+[{n:'01',title:'Why models succeed and fail',desc:'Overfitting → classification tradeoffs · 2 live labs',id:'overfit'},{n:'02',title:'Build your statistical intuition',desc:'Outliers → robust summaries · 1 live lab',id:'outliers'},{n:'03',title:'Inside a modern AI system',desc:'Embeddings → attention → retrieval · concept previews',id:'vectors'}].map(p=>`<div class="path-card"><span class="path-number">${p.n}</span><div><h3>${p.title}</h3><p>${p.desc}</p></div><button class="primary" data-open="${p.id}">Explore ↗</button></div>`).join('');$$('[data-open]').forEach(e=>e.onclick=()=>openLab(e.dataset.open))}

const descriptions={overfit:'Give a model more freedom. Does fitting the training data better always help it predict new observations?',outliers:'Most values stay close together. Move one observation and see which summary moves with it.',threshold:'A model gives you a probability. You choose when it becomes a positive prediction. What does that choice cost?'};

function previewHTML(id){const labels=id==='rag'?['Question','Retrieve evidence','Generate answer']:id==='attention'?['Tokens','Attention weights','Contextual representations']:['Words','Embedding vectors','Similarity'];return `<div class="preview-banner">◌ Concept preview · This module illustrates the planned scope. Its full interactive experiment is not built yet.</div><div class="preview-diagram">${labels.map((l,i)=>`${i?'<span>→</span>':''}<div class="preview-node">${l}</div>`).join('')}</div>`}

function renderDetail(){let fallback={'Intuition':'This planned module connects a local mechanism to the larger AI system. The finished version will let you change an input and inspect intermediate representations.','The math':current==='vectors'?'Cosine similarity is (u · v) / (‖u‖ ‖v‖). A two-dimensional projection can distort distances and should be labeled as a projection.':current==='attention'?'Scaled dot-product attention: softmax(QKᵀ / √dₖ)V. Attention weights describe the computation; they are not a complete explanation of model reasoning.':'Retrieval selects evidence; generation conditions on that evidence and the question. Useful evaluation separates retrieval quality from answer quality.','In practice':'The full experiment will include a realistic application, a failure case, and clearly stated simplifications.','Connections':'Explore a working lab: <button class="text-link" onclick="openLab(\'overfit\')">The overfitting trap ↗</button>'};$('#detailContent').innerHTML=(detail[current]||fallback)[tab]}
route();
