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

(function installCampaignJournalDirection(){
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'campaign.css?v=1';
  document.head.appendChild(link);

  greeting = () => "Edd's Life";
  viewCopy.today = ['CAMPANHA', "Edd's Life", 'Sua vida em quests, progresso e escolhas — sem depender de horário.'];
  viewCopy.character = ['FICHA', 'Ficha de Campanha', 'Nível, progresso, moedas e uma insígnia em destaque.'];

  const hero = document.querySelector('.hero');
  if (hero && !hero.querySelector('.banner-mark')) {
    hero.classList.add('campaign-banner');
    hero.firstElementChild?.classList.add('banner-copy');
    hero.insertAdjacentHTML('afterbegin', '<div class="banner-mark" aria-hidden="true"><span>E</span></div>');
  }

  const avatarCard = document.querySelector('.avatar-card');
  if (avatarCard) {
    avatarCard.className = 'rpg-panel campaign-summary-card';
    avatarCard.innerHTML = `
      <div class="campaign-summary-head">
        <div><p class="eyebrow">FICHA DA CAMPANHA</p><h3>Arquiteto da Rotina</h3></div>
        <button class="chip" data-go-view="character">ficha</button>
      </div>
      <div class="campaign-summary-identity">
        <div class="campaign-mini-sigil" aria-hidden="true">✦</div>
        <div><strong>Edd</strong><p class="muted">O personagem é o seu progresso real.</p></div>
      </div>
      <div class="campaign-metrics">
        <div class="campaign-metric"><span>nível</span><strong id="campaignLevel">1</strong></div>
        <div class="campaign-metric"><span>XP</span><strong id="campaignXp">0</strong></div>
        <div class="campaign-metric"><span>moedas</span><strong id="campaignCoins">0</strong></div>
      </div>
      <div class="campaign-active-quest"><span>quest ativa</span><strong id="campaignQuest">nenhuma selecionada</strong></div>`;
  }

  const characterMain = document.querySelector('.character-main');
  if (characterMain) {
    characterMain.classList.add('campaign-sheet');
    characterMain.innerHTML = `
      <div class="campaign-sigil-stage">
        <div class="campaign-sigil" aria-hidden="true">✦</div>
        <div class="campaign-sigil-label"><strong>Edd's Life</strong><span>campanha pessoal</span></div>
      </div>
      <div class="character-info">
        <p class="eyebrow">FICHA DE CAMPANHA</p>
        <h3>Edd</h3>
        <p class="title-line">Arquiteto da Rotina</p>
        <p class="muted">Seu progresso é representado por nível, XP, moedas, quests e insígnias — sem precisar de avatar.</p>
        <div class="sheet-stats" id="sheetStats"></div>
        <div class="profile-badge" id="profileBadge"></div>
      </div>`;
  }

  document.querySelector('.wardrobe-panel')?.remove();

  const baseRenderCharacter = renderCharacter;
  renderCharacter = function(){
    baseRenderCharacter();
    const xp = totalXp();
    const level = computeLevel(xp);
    const selected = state.questOffers.find(o => o.selected);
    const q = selected && questTemplate(selected.quest_template_id);
    const levelEl = $('#campaignLevel');
    const xpEl = $('#campaignXp');
    const coinEl = $('#campaignCoins');
    const questEl = $('#campaignQuest');
    if (levelEl) levelEl.textContent = level.level;
    if (xpEl) xpEl.textContent = xp.toLocaleString('pt-BR');
    if (coinEl) coinEl.textContent = coinBalance().toLocaleString('pt-BR');
    if (questEl) questEl.textContent = q?.title || 'nenhuma selecionada';
  };
})();

document.write('<link rel="stylesheet" href="focus-layout.css?v=1">');
document.write('<script src="focus-layout.js?v=1"><\/script>');
