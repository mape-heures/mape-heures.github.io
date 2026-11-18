'use strict';
/* Mape Heures — suivi des heures en moins des techniciens (données sur le téléphone) */

const KEY = 'mape-heures-v1';
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JCOURT = ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const JLONG = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

/* ---------- données ---------- */
let S = load();
function load(){
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.techs)) return d; } catch(e){}
  return { techs: [], motifs: ["Manque d'activité", 'Travail réalisé terminé'], entries: [] };
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ toast("Impossible d'enregistrer sur ce téléphone"); }
}

/* ---------- outils ---------- */
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayIso = () => iso(new Date());
const mkey = (y, m) => y + '-' + pad(m + 1);
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function fmt(min){
  if (!min) return '0 h';
  const s = min < 0 ? '−' : '+';
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return s + (h ? h + ' h' + (m ? ' ' + pad(m) : '') : m + ' min');
}
function fmtAbs(min){ const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60; return h ? h + ' h' + (m ? ' ' + pad(m) : '') : m + ' min'; }
const cls = min => min < 0 ? 'ko' : min > 0 ? 'ok' : 'zero';
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const tech = id => S.techs.find(t => t.id === id);
const techName = id => (tech(id) || {}).name || 'Tech supprimé';
const byName = (a, b) => a.name.localeCompare(b.name, 'fr');

function sumWhere(fn){ let s = 0; for (const e of S.entries) if (fn(e)) s += e.min; return s; }
const sumMonth = (tid, k) => sumWhere(e => (!tid || e.techId === tid) && e.date.slice(0, 7) === k);
const sumUpTo = (tid, k) => sumWhere(e => (!tid || e.techId === tid) && e.date.slice(0, 7) <= k);

/* ---------- état de l'écran ---------- */
const now = new Date();
const V = { screen: 'home', tab: 'list', techId: null, techMode: 'list', y: now.getFullYear(), m: now.getMonth(), sel: null, open: {}, confirm: null };
const curKey = () => mkey(V.y, V.m);
const isCurMonth = () => V.y === now.getFullYear() && V.m === now.getMonth();

/* ---------- icônes ---------- */
const I = {
  gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  left: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#203F7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg>',
  xls: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#203F7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
  dl: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#203F7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#203F7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>',
};
const LOGO = '<svg class="brand" role="img" aria-label="MAPE" viewBox="0 0 302 97"><g fill="none" stroke="#8E8E92" stroke-width="11" stroke-linejoin="miter"><path d="M13.5 84.5 V19 L46 66 L78.5 19 V84.5"/><path d="M193 84.5 V19 H216 A18 18 0 0 1 216 55 H193"/><path d="M293 19 H257.5 V84.5 H293 M257.5 51 H289"/></g><svg x="88" y="13" width="80" height="72" viewBox="-2 -2 102 92"><defs><mask id="mhA"><path d="M9 78 L49 10 L89 78" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><polygon points="49,29 27.6,66 70.4,66" fill="#fff" stroke="#fff" stroke-width="1"/></mask></defs><g mask="url(#mhA)"><polygon points="0,4.6 49,46.5 49,200 -10,200 -10,-10" fill="#203F7A"/><polygon points="100,0.2 49,46.5 49,200 110,200 110,-10" fill="#86D1B0"/><polygon points="49,46.5 0,4.6 0,-10 100,-10 100,0.2" fill="#C8204A"/><polygon points="49,46.5 30,67.5 68,67.5" fill="#F9B91F"/></g></svg></svg>';
const CLOCK = '<span class="tick"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>';

/* ---------- rendu ---------- */
function render(){
  if (V.screen === 'tech' && !tech(V.techId)) V.screen = 'home';
  if (V.screen === 'home') renderHome();
  else if (V.screen === 'tech') renderTech();
  else renderSettings();
}

function monthNav(){
  const cur = isCurMonth();
  return `<div class="mnav">
    <button class="ib" data-a="prevM" aria-label="Mois précédent">${I.left}</button>
    <div class="t"><b>${cap(MOIS[V.m])} ${V.y}</b><small class="${cur ? '' : 'past'}">${cur ? 'Mois en cours' : 'Mois passé'}</small></div>
    <button class="ib" data-a="nextM" aria-label="Mois suivant" ${cur ? 'disabled' : ''}>${I.right}</button>
  </div>`;
}

function renderHome(){
  $('#hdr').innerHTML = `<div class="brandw">${LOGO}${CLOCK}</div>
    <div class="htxt"><b>Heures</b><small>Départs anticipés de l'équipe</small></div>
    <button class="ib" data-a="settings" aria-label="Réglages" style="margin-right:-8px">${I.gear}</button>`;
  const k = curKey();
  const mo = sumMonth(null, k), cu = sumUpTo(null, k);
  let h = `<div class="seg" role="tablist">
      <button class="${V.tab === 'list' ? 'on' : ''}" data-a="tab" data-v="list" role="tab" aria-selected="${V.tab === 'list'}">Techniciens</button>
      <button class="${V.tab === 'cal' ? 'on' : ''}" data-a="tab" data-v="cal" role="tab" aria-selected="${V.tab === 'cal'}">Calendrier équipe</button>
    </div>${monthNav()}
    <div class="stats"><div><b class="${cls(mo)}">${fmt(mo)}</b><span>Équipe · ${MOIS[V.m]}</span></div>
    <div><b>${fmt(cu)}</b><span>Équipe · cumul${isCurMonth() ? ' total' : ' à fin ' + MOIS[V.m]}</span></div></div>`;

  if (V.tab === 'list'){
    const active = S.techs.filter(t => !t.archived).sort(byName);
    const archWith = S.techs.filter(t => t.archived && S.entries.some(e => e.techId === t.id && e.date.slice(0, 7) === k)).sort(byName);
    const rows = active.concat(archWith);
    if (!rows.length){
      h += `<div class="card empty">Aucun technicien pour l'instant.<br><button class="btn pri" style="margin-top:14px;flex:none" data-a="settings">Ajouter mes techniciens</button></div>`;
    } else {
      h += `<div class="lbl"><span>Technicien</span><span>${cap(MOIS[V.m])}</span></div><div class="list">`;
      for (const t of rows){
        const m = sumMonth(t.id, k), c = sumUpTo(t.id, k);
        h += `<button class="li" data-a="openTech" data-v="${t.id}">
          <div class="av ${m ? '' : 'none'}">${esc(initials(t.name))}</div>
          <div class="t"><b>${esc(t.name)}${t.archived ? ' <small>(archivé)</small>' : ''}</b><small>Cumul ${fmt(c)}</small></div>
          <span class="pill ${cls(m)} ${cls(m)}">${fmt(m)}</span></button>`;
      }
      h += `</div><div class="note">Le mois repart à zéro le 1<sup>er</sup> · le cumul continue</div>`;
    }
  } else {
    h += calendar(null);
    h += dayDetail(null);
  }
  $('#main').innerHTML = h;
  $('#fabw').innerHTML = S.techs.some(t => !t.archived) ? `<button class="fab" data-a="new">${I.plus}Saisir des heures</button>` : '';
}

function calendar(tid){
  const y = V.y, m = V.m, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7, today = todayIso();
  let g = '';
  for (let i = 0; i < off; i++) g += '<div></div>';
  for (let d = 1; d <= days; d++){
    const ds = y + '-' + pad(m + 1) + '-' + pad(d);
    const es = S.entries.filter(e => e.date === ds && (!tid || e.techId === tid));
    const sum = es.reduce((a, e) => a + e.min, 0);
    const wd = (off + d - 1) % 7;
    const c = ['dc'];
    if (wd >= 5) c.push('we');
    if (es.length) c.push(sum > 0 ? 'has-ok' : 'has-ko');
    if (ds === today) c.push('today');
    if (ds === V.sel) c.push('sel');
    let inner = `<span class="n">${d}</span>`;
    if (es.length){
      inner += `<span class="s ${sum > 0 ? 'ok' : 'ko'}">${sum ? fmt(sum) : '±0'}</span>`;
      if (!tid){ const n = new Set(es.map(e => e.techId)).size; inner += `<span class="c">${n} tech${n > 1 ? 's' : ''}</span>`; }
    }
    const lab = `${d} ${MOIS[m]}${es.length ? ', ' + fmt(sum) : ''}`;
    g += `<button class="${c.join(' ')}" data-a="day" data-v="${ds}" aria-label="${lab}" aria-pressed="${ds === V.sel}">${inner}</button>`;
  }
  return `<div class="cal">
    <div class="wd"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
    <div class="gd">${g}</div></div>`;
}

function dayDetail(tid){
  if (!V.sel || V.sel.slice(0, 7) !== curKey()) return `<div class="note">Touche un jour pour voir le détail.</div>`;
  const d = parse(V.sel);
  const es = S.entries.filter(e => e.date === V.sel && (!tid || e.techId === tid)).sort((a, b) => techName(a.techId).localeCompare(techName(b.techId), 'fr'));
  let h = `<div class="dayh"><span>${JLONG[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}</span><button class="lnk" data-a="newDay" data-v="${V.sel}">+ Saisir ce jour</button></div>`;
  if (!es.length) return h + `<div class="card empty" style="padding:20px">Rien ce jour-là.</div>`;
  h += '<div class="list">';
  for (const e of es){
    const title = tid ? esc(e.motif || (e.min > 0 ? 'Heures rendues' : 'Sans motif')) : esc(techName(e.techId));
    const sub = tid ? esc(e.note) : esc([e.motif, e.note].filter(Boolean).join(' · '));
    h += `<button class="er" data-a="edit" data-v="${e.id}">
      ${tid ? '' : `<div class="av" style="width:36px;height:36px;font-size:13px">${esc(initials(techName(e.techId)))}</div>`}
      <div class="t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>
      <span class="v ${cls(e.min)}">${fmt(e.min)}</span></button>`;
  }
  return h + '</div>';
}

function entryRow(e){
  const d = parse(e.date);
  return `<button class="er" data-a="edit" data-v="${e.id}">
    <div class="d"><small>${JCOURT[d.getDay()]}</small><b>${d.getDate()}</b></div>
    <div class="t"><b>${esc(e.motif || (e.min > 0 ? 'Heures rendues' : 'Sans motif'))}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</div>
    <span class="v ${cls(e.min)}">${fmt(e.min)}</span></button>`;
}

function renderTech(){
  const t = tech(V.techId), k = curKey();
  $('#hdr').innerHTML = `<button class="ib back" data-a="home" aria-label="Retour">${I.left}</button>
    <div class="av" style="width:38px;height:38px;font-size:14px">${esc(initials(t.name))}</div>
    <div class="htxt" style="margin-left:0"><b>${esc(t.name)}</b><small>${t.archived ? 'Archivé' : 'Technicien'}</small></div>`;
  const mo = sumMonth(t.id, k), cu = sumUpTo(t.id, k);
  let h = `<div class="stats"><div><b class="${cls(mo)}">${fmt(mo)}</b><span>${cap(MOIS[V.m])} ${V.y}</span></div>
    <div><b>${fmt(cu)}</b><span>Cumul${isCurMonth() ? ' total' : ' à fin ' + MOIS[V.m]}</span></div></div>
    <div class="seg">
      <button class="${V.techMode === 'list' ? 'on' : ''}" data-a="tmode" data-v="list" aria-pressed="${V.techMode === 'list'}">Liste</button>
      <button class="${V.techMode === 'cal' ? 'on' : ''}" data-a="tmode" data-v="cal" aria-pressed="${V.techMode === 'cal'}">Calendrier</button>
    </div>`;
  const mine = S.entries.filter(e => e.techId === t.id);
  if (V.techMode === 'list'){
    const keys = [...new Set(mine.map(e => e.date.slice(0, 7)).concat([k]))].sort().reverse();
    const recent = keys.filter(x => x >= k), past = keys.filter(x => x < k);
    const block = (key) => {
      const es = mine.filter(e => e.date.slice(0, 7) === key).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
      const open = V.open[key] != null ? V.open[key] : key === k;
      const [yy, mm] = key.split('-').map(Number);
      const s = es.reduce((a, e) => a + e.min, 0);
      let b = `<button class="mh ${open ? 'open' : ''}" data-a="toggleM" data-v="${key}" aria-expanded="${open}">${open ? I.down : I.right}
        <span class="n">${cap(MOIS[mm - 1])} ${yy} <small>· ${es.length} saisie${es.length > 1 ? 's' : ''}</small></span><span class="v ${cls(s)}">${fmt(s)}</span></button>`;
      if (open) b += es.length ? es.map(entryRow).join('') : `<div class="empty" style="padding:18px">Aucune saisie ce mois-ci.</div>`;
      return b;
    };
    h += `<div class="list mblock">${recent.map(block).join('')}</div>`;
    if (past.length) h += `<div class="lbl" style="margin-top:16px"><span>Mois précédents</span></div><div class="list">${past.map(block).join('')}</div>`;
  } else {
    h += monthNav() + calendar(t.id) + dayDetail(t.id);
  }
  $('#main').innerHTML = h;
  const first = t.name.split(/\s+/)[0];
  $('#fabw').innerHTML = t.archived ? '' : `<button class="fab" data-a="new" data-v="${t.id}">${I.plus}Saisir pour ${esc(first)}</button>`;
}

function renderSettings(){
  $('#hdr').innerHTML = `<button class="ib back" data-a="home" aria-label="Retour">${I.left}</button><div class="htxt" style="margin-left:0"><b>Réglages</b></div>`;
  const act = S.techs.filter(t => !t.archived).sort(byName), arch = S.techs.filter(t => t.archived).sort(byName);
  let h = `<div class="lbl b"><span>Techniciens</span></div>`;
  if (act.length){
    h += `<div class="list" style="margin-bottom:8px">` + act.map(t => `<div class="sr"><span>${esc(t.name)}</span>${
      V.confirm === 'arch:' + t.id ? `<button class="cf" data-a="archive" data-v="${t.id}">Confirmer le retrait</button>` : `<button class="ib" style="color:var(--ko)" data-a="askArchive" data-v="${t.id}" aria-label="Retirer ${esc(t.name)}">${I.trash}</button>`
    }</div>`).join('') + `</div>`;
  }
  h += `<form class="row" data-f="addTech"><label for="nt" class="vh">Nom du nouveau technicien</label>
    <input id="nt" type="text" placeholder="Nom du nouveau tech" autocomplete="off" style="flex:1;min-width:0">
    <button class="btn pri sm" style="flex:none" type="submit">Ajouter</button></form>
    <div class="hint">Un tech retiré est archivé : son historique reste visible dans les mois passés.</div>`;
  if (arch.length){
    h += `<div class="lbl"><span>Archivés</span></div><div class="list" style="margin-bottom:18px">` + arch.map(t => `<div class="sr"><span style="color:var(--muted)">${esc(t.name)}</span>
      <button class="rs" data-a="openTech" data-v="${t.id}">Historique</button><button class="rs" data-a="restore" data-v="${t.id}">Restaurer</button></div>`).join('') + `</div>`;
  }
  h += `<div class="lbl b"><span>Motifs récurrents</span></div>
    <div class="card" style="padding:12px;margin-bottom:8px"><div class="chips">${S.motifs.map((m, i) => `<span class="mchip">${esc(m)}<button data-a="delMotif" data-v="${i}" aria-label="Supprimer le motif ${esc(m)}">×</button></span>`).join('') || '<span class="zero" style="font-size:14px">Aucun motif</span>'}</div></div>
    <form class="row" data-f="addMotif" style="margin-bottom:18px"><label for="nm" class="vh">Nouveau motif</label>
    <input id="nm" type="text" placeholder="Nouveau motif" autocomplete="off" style="flex:1;min-width:0">
    <button class="btn pri sm" style="flex:none" type="submit">Ajouter</button></form>
    <div class="lbl b"><span>Export et sauvegarde</span></div>
    <div class="list">
      <button class="sb" data-a="pdf">${I.pdf}Récap de ${MOIS[V.m]} ${V.y} (PDF)</button>
      <button class="sb" data-a="csv">${I.xls}Tout l'historique (Excel)</button>
      <button class="sb" data-a="backup">${I.dl}Sauvegarder les données</button>
      <button class="sb" data-a="restoreFile">${I.up}Restaurer une sauvegarde</button>
    </div>
    <div class="warn">Les données restent sur ce téléphone. Pense à faire une sauvegarde de temps en temps (perte ou changement de téléphone).</div>`;
  $('#main').innerHTML = h;
  $('#fabw').innerHTML = '';
}

/* ---------- formulaire de saisie ---------- */
let F = null;
function openForm(opts){
  opts = opts || {};
  if (opts.edit){
    const e = S.entries.find(x => x.id === opts.edit); if (!e) return;
    F = { edit: e.id, ids: new Set([e.techId]), sign: e.min > 0 ? 1 : -1, min: Math.abs(e.min), date: e.date, motif: e.motif || '', note: e.note || '', newMotif: false, del: false, err: '' };
  } else {
    F = { edit: null, ids: new Set(opts.tech ? [opts.tech] : []), sign: -1, min: 60, date: opts.date || todayIso(), motif: S.motifs[0] || '', note: '', newMotif: false, del: false, err: '' };
  }
  renderForm();
  $('#sheet').classList.add('on');
}
function closeForm(){ $('#sheet').classList.remove('on'); F = null; }

function renderForm(){
  const act = S.techs.filter(t => !t.archived).sort(byName);
  const n = F.ids.size;
  let h = `<div class="grab"></div><div class="sh"><h2>${F.edit ? 'Modifier la saisie' : 'Nouvelle saisie'}</h2>
    <button class="ib" data-a="closeForm" aria-label="Fermer" style="margin-right:-10px;color:var(--muted)">${I.close}</button></div>`;
  if (F.edit){
    h += `<div class="fl" style="margin-top:0"><span>Technicien</span></div><div style="font-weight:700;font-size:17px">${esc(techName([...F.ids][0]))}</div>`;
  } else {
    h += `<div class="fl" style="margin-top:0"><span>Techniciens ${n ? `<b>· ${n} coché${n > 1 ? 's' : ''}</b>` : ''}</span>
      <button class="lnk" data-a="allTechs">${n === act.length ? 'Tout décocher' : 'Tout cocher'}</button></div>
      <div class="chips">${act.map(t => { const on = F.ids.has(t.id); return `<button class="chip ${on ? 'on' : ''}" data-a="fTech" data-v="${t.id}" aria-pressed="${on}">${on ? I.check : ''}${esc(t.name)}</button>`; }).join('')}</div>`;
  }
  h += `<div class="sign" style="margin-top:14px">
      <button class="m ${F.sign < 0 ? 'on' : ''}" data-a="fSign" data-v="-1" aria-pressed="${F.sign < 0}">− Heures en moins</button>
      <button class="p ${F.sign > 0 ? 'on' : ''}" data-a="fSign" data-v="1" aria-pressed="${F.sign > 0}">+ Heures rendues</button></div>
    <div class="fl"><span>Durée</span></div>
    <div class="step"><button data-a="fStep" data-v="-15" aria-label="Retirer un quart d'heure">−</button>
      <b class="${F.sign < 0 ? 'ko' : 'ok'}" aria-live="polite">${F.sign < 0 ? '−' : '+'}${fmtAbs(F.min)}</b>
      <button data-a="fStep" data-v="15" aria-label="Ajouter un quart d'heure">+</button></div>
    <div class="qd">${[[15, '¼ h'], [30, '½ h'], [60, '1 h'], [120, '2 h']].map(([v, l]) => `<button class="chip ${F.min === v ? 'mo on' : ''}" data-a="fSet" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="fl"><label for="fd">Date</label><span>${F.date === todayIso() ? "Aujourd'hui" : ''}</span></div>
    <input id="fd" type="date" value="${F.date}" max="${todayIso()}">
    <div class="fl"><span>Motif</span></div>
    <div class="chips">${S.motifs.map(m => `<button class="chip mo ${F.motif === m ? 'on' : ''}" data-a="fMotif" data-v="${esc(m)}" aria-pressed="${F.motif === m}">${esc(m)}</button>`).join('')}
      ${F.motif && !S.motifs.includes(F.motif) ? `<button class="chip mo on" data-a="fMotif" data-v="${esc(F.motif)}" aria-pressed="true">${esc(F.motif)}</button>` : ''}
      <button class="chip add" data-a="fNewMotif">+ Nouveau motif</button></div>
    ${F.newMotif ? `<form class="row" data-f="formMotif" style="margin-top:8px"><label for="fnm" class="vh">Nouveau motif</label><input id="fnm" type="text" placeholder="Nouveau motif" autocomplete="off" style="flex:1;min-width:0"><button class="btn pri sm" style="flex:none" type="submit">OK</button></form>` : ''}
    <div class="fl"><label for="fn">Commentaire (facultatif)</label></div>
    <input id="fn" type="text" value="${esc(F.note)}" placeholder="Ex. salle 214 terminée plus tôt" autocomplete="off">
    <div class="err">${esc(F.err)}</div>
    <div class="acts" style="margin-top:6px">`;
  if (F.edit) h += `<button class="btn dang ${F.del ? 'cf' : ''}" data-a="fDel">${F.del ? 'Confirmer' : 'Supprimer'}</button>`;
  else h += `<button class="btn" data-a="closeForm">Annuler</button>`;
  const lab = F.edit ? 'Enregistrer' : (n > 1 ? `Enregistrer (${n} × ${F.sign < 0 ? '−' : '+'}${fmtAbs(F.min)})` : `Enregistrer ${F.sign < 0 ? '−' : '+'}${fmtAbs(F.min)}`);
  h += `<button class="btn pri" data-a="fSave">${lab}</button></div>`;
  $('#sheetP').innerHTML = h;
}
function syncFormInputs(){
  if (!F) return;
  const d = $('#fd'), n = $('#fn');
  if (d && d.value) F.date = d.value;
  if (n) F.note = n.value;
}

function saveForm(){
  syncFormInputs();
  if (!F.ids.size){ F.err = 'Coche au moins un technicien.'; return renderForm(); }
  if (!F.date){ F.err = 'Choisis une date.'; return renderForm(); }
  const min = F.sign * F.min, note = F.note.trim();
  if (F.edit){
    const e = S.entries.find(x => x.id === F.edit);
    if (e){ e.min = min; e.date = F.date; e.motif = F.motif; e.note = note; }
    toast('Saisie modifiée');
  } else {
    for (const tid of F.ids) S.entries.push({ id: uid(), techId: tid, date: F.date, min, motif: F.motif, note, created: Date.now() });
    toast(F.ids.size > 1 ? `Enregistré pour ${F.ids.size} techs` : 'Enregistré');
  }
  save();
  const d = parse(F.date); V.y = d.getFullYear(); V.m = d.getMonth();
  if (V.tab === 'cal' || V.techMode === 'cal') V.sel = F.date;
  closeForm(); render();
}

/* ---------- exports ---------- */
function download(name, content, type){
  try {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch(e){ toast('Téléchargement impossible ici'); }
}
function exportCSV(){
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const rows = [['Date', 'Technicien', 'Heures (h décimales)', 'Durée', 'Type', 'Motif', 'Commentaire'].map(q).join(';')];
  const es = S.entries.slice().sort((a, b) => a.date.localeCompare(b.date) || techName(a.techId).localeCompare(techName(b.techId), 'fr'));
  for (const e of es){
    const d = parse(e.date);
    rows.push([pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(), techName(e.techId), String(e.min / 60).replace('.', ','), fmt(e.min), e.min < 0 ? 'En moins' : 'Rendues', e.motif, e.note].map(q).join(';'));
  }
  download('mape-heures-historique-' + todayIso() + '.csv', '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
}
function exportPDF(){
  const k = curKey();
  const es = S.entries.filter(e => e.date.slice(0, 7) === k).sort((a, b) => a.date.localeCompare(b.date));
  const ids = [...new Set(S.techs.filter(t => !t.archived).map(t => t.id).concat(es.map(e => e.techId)))].sort((a, b) => techName(a).localeCompare(techName(b), 'fr'));
  let h = `<h1>Mape Heures · ${cap(MOIS[V.m])} ${V.y}</h1><div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
    <table><thead><tr><th>Technicien</th><th>${cap(MOIS[V.m])}</th><th>Cumul à fin de mois</th></tr></thead><tbody>`;
  for (const id of ids) h += `<tr><td>${esc(techName(id))}</td><td class="n">${fmt(sumMonth(id, k))}</td><td class="n">${fmt(sumUpTo(id, k))}</td></tr>`;
  h += `<tr><th>Équipe</th><th class="n">${fmt(sumMonth(null, k))}</th><th class="n">${fmt(sumUpTo(null, k))}</th></tr></tbody></table>
    <table><thead><tr><th>Date</th><th>Technicien</th><th>Durée</th><th>Motif</th><th>Commentaire</th></tr></thead><tbody>`;
  for (const e of es){ const d = parse(e.date); h += `<tr><td>${JCOURT[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}</td><td>${esc(techName(e.techId))}</td><td class="n">${fmt(e.min)}</td><td>${esc(e.motif)}</td><td>${esc(e.note)}</td></tr>`; }
  if (!es.length) h += `<tr><td colspan="5">Aucune saisie ce mois-ci.</td></tr>`;
  $('#print').innerHTML = h + '</tbody></table>';
  setTimeout(() => { try { window.print(); } catch(e){ toast('Impression impossible ici'); } }, 50);
}
function restoreFile(file){
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || !Array.isArray(d.techs) || !Array.isArray(d.entries)) throw 0;
      S = { techs: d.techs, motifs: Array.isArray(d.motifs) ? d.motifs : [], entries: d.entries };
      save(); render(); toast('Sauvegarde restaurée');
    } catch(e){ toast("Ce fichier n'est pas une sauvegarde Mape Heures"); }
  };
  r.readAsText(file);
}

/* ---------- événements ---------- */
let tt;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  if (!b){ if (ev.target.id === 'sheet') closeForm(); return; }
  const a = b.dataset.a, v = b.dataset.v;
  if (a !== 'askArchive' && a !== 'archive') V.confirm = null;
  switch (a){
    case 'settings': V.screen = 'settings'; render(); scrollTo(0, 0); break;
    case 'home': V.screen = 'home'; V.sel = null; render(); scrollTo(0, 0); break;
    case 'tab': V.tab = v; V.sel = null; render(); break;
    case 'prevM': V.m--; if (V.m < 0){ V.m = 11; V.y--; } V.sel = null; V.open = {}; render(); break;
    case 'nextM': if (!isCurMonth()){ V.m++; if (V.m > 11){ V.m = 0; V.y++; } V.sel = null; V.open = {}; render(); } break;
    case 'openTech': V.screen = 'tech'; V.techId = v; V.sel = null; V.open = {}; render(); scrollTo(0, 0); break;
    case 'tmode': V.techMode = v; V.sel = null; render(); break;
    case 'toggleM': { const cur = V.open[v] != null ? V.open[v] : v === curKey(); V.open[v] = !cur; render(); break; }
    case 'day': V.sel = V.sel === v ? null : v; render(); break;
    case 'new': openForm({ tech: v }); break;
    case 'newDay': openForm({ tech: V.screen === 'tech' ? V.techId : null, date: v }); break;
    case 'edit': openForm({ edit: v }); break;
    case 'closeForm': closeForm(); break;
    case 'fTech': syncFormInputs(); F.ids.has(v) ? F.ids.delete(v) : F.ids.add(v); F.err = ''; renderForm(); break;
    case 'allTechs': { syncFormInputs(); const act = S.techs.filter(t => !t.archived); F.ids = F.ids.size === act.length ? new Set() : new Set(act.map(t => t.id)); F.err = ''; renderForm(); break; }
    case 'fSign': syncFormInputs(); F.sign = Number(v); renderForm(); break;
    case 'fStep': syncFormInputs(); F.min = Math.min(720, Math.max(15, F.min + Number(v))); renderForm(); break;
    case 'fSet': syncFormInputs(); F.min = Number(v); renderForm(); break;
    case 'fMotif': syncFormInputs(); F.motif = F.motif === v ? '' : v; renderForm(); break;
    case 'fNewMotif': syncFormInputs(); F.newMotif = !F.newMotif; renderForm(); if (F.newMotif) $('#fnm').focus(); break;
    case 'fDel':
      if (!F.del){ syncFormInputs(); F.del = true; renderForm(); }
      else { S.entries = S.entries.filter(e => e.id !== F.edit); save(); closeForm(); render(); toast('Saisie supprimée'); }
      break;
    case 'fSave': saveForm(); break;
    case 'askArchive': V.confirm = 'arch:' + v; render(); break;
    case 'archive': { const t = tech(v); if (t){ t.archived = true; save(); toast(t.name + ' archivé'); } V.confirm = null; render(); break; }
    case 'restore': { const t = tech(v); if (t){ t.archived = false; save(); toast(t.name + ' restauré'); } render(); break; }
    case 'delMotif': S.motifs.splice(Number(v), 1); save(); render(); break;
    case 'pdf': exportPDF(); break;
    case 'csv': exportCSV(); break;
    case 'backup': download('mape-heures-sauvegarde-' + todayIso() + '.json', JSON.stringify(S, null, 1), 'application/json'); break;
    case 'restoreFile': $('#fileIn').click(); break;
  }
});

document.addEventListener('submit', ev => {
  const f = ev.target.closest('[data-f]'); if (!f) return;
  ev.preventDefault();
  const inp = f.querySelector('input'), val = inp.value.trim();
  if (!val) return;
  if (f.dataset.f === 'addTech'){
    if (S.techs.some(t => !t.archived && t.name.toLowerCase() === val.toLowerCase())) return toast('Ce tech existe déjà');
    S.techs.push({ id: uid(), name: val, archived: false }); save(); render(); toast(val + ' ajouté');
    const n = $('#nt'); if (n) n.focus();
  } else if (f.dataset.f === 'addMotif'){
    if (!S.motifs.includes(val)) S.motifs.push(val); save(); render();
  } else if (f.dataset.f === 'formMotif'){
    syncFormInputs();
    if (!S.motifs.includes(val)){ S.motifs.push(val); save(); }
    F.motif = val; F.newMotif = false; renderForm();
  }
});

document.addEventListener('change', ev => {
  if (ev.target.id === 'fd' && F){ syncFormInputs(); renderForm(); }
  if (ev.target.id === 'fileIn' && ev.target.files[0]){ restoreFile(ev.target.files[0]); ev.target.value = ''; }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && F) closeForm(); });

render();
