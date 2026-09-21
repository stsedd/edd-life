const QUEST_ART = {
  scholar: 'assets/quest-scholar.svg',
  wanderer: 'assets/quest-wanderer.svg',
  organization: 'assets/quest-organization.svg'
};

function questArt(q, slot) {
  const title = (q?.title || '').toLowerCase();
  const category = (q?.category || '').toLowerCase();
  if (title.includes('scholar') || title.includes('estud') || title.includes('livro') || category.includes('growth')) return QUEST_ART.scholar;
  if (title.includes('inbox') || title.includes('organ') || title.includes('admin') || category.includes('organization')) return QUEST_ART.organization;
  if (title.includes('home') || title.includes('house') || title.includes('casa') || category.includes('home')) return QUEST_ART.wanderer;
  return [QUEST_ART.scholar, QUEST_ART.wanderer, QUEST_ART.organization][(slot - 1) % 3];
}

function questRoman(slot) {
  return ['I','II','III'][Math.max(0, Math.min(2, (slot || 1) - 1))];
}

function questBadge(q) {
  const map = { growth:'growth', home:'home', organization:'organization' };
  return map[(q?.category || '').toLowerCase()] || 'quest';
}

function questCardMarkup(offer) {
  const q = questTemplate(offer.quest_template_id);
  if (!q) return '';
  const pct = progressPct(offer);
  return `<article class="quest-card tarot ${offer.selected ? 'selected' : ''}">
    <div class="tarot-frame">
      <span class="tarot-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <div class="tarot-kicker"><span>${questRoman(offer.slot)}</span><span>${escapeHtml(questBadge(q))}</span></div>
      <div class="quest-art tarot-art"><img src="${questArt(q, offer.slot)}" alt="Símbolo da carta ${escapeHtml(q.title)}" loading="eager"></div>
      <div class="tarot-title"><span class="tarot-rule"></span><h4>${escapeHtml(q.title)}</h4><span class="tarot-rule"></span></div>
      <p class="tarot-description">${escapeHtml(q.description)}</p>
      <div class="quest-meta tarot-meta"><span>+${q.xp_reward} XP</span><span>+${q.coin_reward} 🪙</span></div>
      <div class="progress tarot-progress"><span style="width:${pct}%"></span></div>
      <div class="quest-actions">
        <button class="btn ${offer.selected ? 'secondary' : 'primary'} small" data-select-quest="${offer.id}">${offer.selected ? 'selecionada' : 'escolher'}</button>
        <button class="btn secondary small" data-reroll-quest="${offer.id}" ${offer.rerolled ? 'disabled' : ''}>↻ ${offer.rerolled ? 'usado' : 'reroll'}</button>
      </div>
    </div>
  </article>`;
}

function renderQuests() {
  const cards = state.questOffers.map(questCardMarkup).join('');
  $('#questGrid').innerHTML = cards + `
    <div class="free-week-option">
      <div class="free-week-copy">
        <div class="free-week-icon">☾</div>
        <div><strong>Semana livre</strong><span>Não escolher uma quest também é válido. Nada vira dívida.</span></div>
      </div>
      <button class="btn secondary small" id="clearQuest">ficar sem quest</button>
    </div>`;
  $('#questWeekLabel').textContent = `semana de ${formatDate(isoDateLocal(mondayOf()))}`;
  renderQuestMini();
}

function renderQuestMini() {
  const selected = state.questOffers.find(o => o.selected);
  const q = selected && questTemplate(selected.quest_template_id);
  if (!q) {
    $('#activeQuestMini').innerHTML = `<div class="section-head compact"><div><p class="eyebrow">QUEST DA SEMANA</p><h3>Nenhuma selecionada</h3></div></div><p class="muted" style="margin:0;font-size:12px">Escolha uma carta quando quiser — ou deixe a semana livre.</p><button class="btn secondary small" data-go-view="quests" style="margin-top:10px">ver cartas</button>`;
    return;
  }
  $('#activeQuestMini').innerHTML = `<div class="section-head compact"><div><p class="eyebrow">QUEST DA SEMANA</p><h3>${escapeHtml(q.title)}</h3></div><button class="chip" data-go-view="quests">trocar</button></div>
    <div class="mini-quest tarot-mini">
      <div class="mini-tarot-card">
        <span class="mini-tarot-kicker">${questRoman(selected.slot)} · ${escapeHtml(questBadge(q))}</span>
        <img src="${questArt(q, selected.slot)}" alt="${escapeHtml(q.title)}">
        <strong>${escapeHtml(q.title)}</strong>
      </div>
      <div class="mini-quest-copy">
        <p>${escapeHtml(q.description)}</p>
        <div class="progress"><span style="width:${progressPct(selected)}%"></span></div>
        <div class="mini-meta"><span>+${q.xp_reward} XP</span><span>+${q.coin_reward} 🪙</span></div>
      </div>
    </div>`;
}

document.write('<script src="wardrobe-fix.js?v=3"><\/script>');
