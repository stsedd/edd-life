const COSMETIC_CATALOG = [
  {
    code:'explorer',
    name:'Explorador de Café',
    asset:'assets/avatar-explorer.svg',
    unlock:'starter',
    detail:'Look base no espírito do Habitica: jaqueta marrom, bolsa lateral e ar de aventureiro urbano.'
  },
  {
    code:'noir',
    name:'Noir Urbano',
    asset:'assets/avatar-noir.svg',
    unlock:'starter',
    detail:'Versão escura e minimalista, com silhueta mais elegante para dias focados.'
  },
  {
    code:'crimson',
    name:'Carmesim',
    asset:'assets/avatar-crimson.svg',
    unlock:'starter',
    detail:'Inspirado no seu look vermelho de alfaiataria: mais presença, mais drama, mais main character.'
  },
  {
    code:'moss',
    name:'Caminhante de Musgo',
    asset:'assets/avatar-moss.svg',
    unlock:'level',
    level:5,
    detail:'Visual de trilha e fantasia cozy. Desbloqueia no nível 5.'
  }
];

(function injectWardrobeQuestPolish(){
  if(document.getElementById('edd-v24-polish')) return;
  const style=document.createElement('style');
  style.id='edd-v24-polish';
  style.textContent=`
    .outfit-tint{display:none!important}
    .avatar-image{image-rendering:auto;filter:drop-shadow(0 12px 18px rgba(55,35,20,.14))}
    .wardrobe-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}
    .cosmetic-card{padding:10px!important;border-radius:14px!important;gap:9px!important;grid-template-columns:1fr!important;grid-template-rows:auto minmax(72px,auto) auto!important;background:rgba(255,255,255,.42)!important}
    .cosmetic-preview{position:relative!important;min-height:192px!important;height:192px!important;border-radius:12px!important;overflow:hidden!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:6px 8px 0!important;background:radial-gradient(circle at 50% 28%,rgba(255,247,235,.92),rgba(232,220,201,.72) 48%,rgba(206,188,162,.45) 100%)!important;border:1px solid rgba(120,90,55,.16)!important}
    .wardrobe-preview{width:min(146px,82%)!important;height:100%!important;display:flex!important;align-items:flex-end!important;justify-content:center!important}
    .wardrobe-preview .avatar-image{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important}
    .cosmetic-rarity{font-size:9px!important;left:8px!important;top:8px!important;padding:4px 7px!important}
    .cosmetic-copy h4{font-size:15px!important;line-height:1.15!important;margin-bottom:3px!important}
    .cosmetic-copy p{font-size:11px!important;line-height:1.35!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .cosmetic-card .btn{width:100%!important}
    .cosmetic-card.equipped{box-shadow:0 0 0 2px rgba(144,106,64,.18) inset!important}

    .quest-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;align-items:start!important}
    .quest-card.tarot{min-height:0!important;height:auto!important;border-radius:13px!important}
    .tarot-frame{min-height:0!important;height:auto!important;padding:9px 9px 10px!important;margin:6px!important;gap:7px!important;display:grid!important;align-content:start!important;grid-template-rows:auto 138px auto auto auto auto!important}
    .tarot-frame::before{top:18px!important}
    .tarot-kicker{font-size:9px!important;padding:0 4px!important;min-height:18px!important;margin-bottom:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important}
    .tarot-art{height:138px!important;min-height:138px!important;border-radius:6px!important;display:grid!important;place-items:center!important;padding:8px 12px!important;overflow:hidden!important;background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.015))!important;border:1px solid rgba(212,169,87,.24)!important}
    .tarot-art img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center center!important;image-rendering:auto!important;transform:none!important}
    .tarot-title{gap:7px!important;align-items:center!important}
    .tarot-title h4{font-size:18px!important;line-height:1.05!important}
    .tarot-description{font-size:11.5px!important;line-height:1.35!important;min-height:0!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .tarot-progress{height:7px!important;margin-top:0!important}
    .tarot-meta{font-size:10px!important;gap:8px!important;justify-content:center!important}
    .tarot .quest-actions{display:grid!important;grid-template-columns:1.35fr .85fr!important;gap:7px!important}
    .tarot .quest-actions .btn{width:100%!important;min-height:34px!important;font-size:11px!important;padding:6px 8px!important}
    @media(max-width:1180px){.quest-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.wardrobe-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:680px){.quest-grid,.wardrobe-grid{grid-template-columns:1fr!important}.tarot-frame{grid-template-rows:auto 130px auto auto auto auto!important}.tarot-art{height:130px!important;min-height:130px!important}.cosmetic-preview{height:200px!important}}
  `;
  document.head.appendChild(style);
})();

function currentLookCode() {
  return state.user?.user_metadata?.equipped_look || 'explorer';
}

function currentLook() {
  return COSMETIC_CATALOG.find(item => item.code === currentLookCode()) || COSMETIC_CATALOG[0];
}

function cosmeticUnlocked(item) {
  if (item.unlock === 'starter') return true;
  if (item.unlock === 'level') return computeLevel(totalXp()).level >= item.level;
  return false;
}

function spriteFallback(img, wrap) {
  if (!img) return;
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = COSMETIC_CATALOG[0].asset;
  wrap?.classList.add('asset-fallback');
}

function applyLookToSprite(wrap, code) {
  if (!wrap) return;
  const item = COSMETIC_CATALOG.find(x => x.code === code) || COSMETIC_CATALOG[0];
  const img = wrap.querySelector('img');
  wrap.dataset.look = item.code;
  wrap.classList.remove('asset-fallback');
  if (img) {
    img.dataset.fallbackApplied = '0';
    img.src = item.asset;
    img.alt = `Avatar de Edd com o look ${item.name}`;
    img.onerror = () => spriteFallback(img, wrap);
  }
  const tint = wrap.querySelector('.outfit-tint');
  if (tint) tint.style.display = 'none';
}

function setAvatarSources() {
  const look = currentLook();
  applyLookToSprite($('#homeAvatarWrap'), look.code);
  applyLookToSprite($('#sheetAvatarWrap'), look.code);
}

function cosmeticPreviewMarkup(item, current) {
  const unlocked = cosmeticUnlocked(item);
  const equipped = current === item.code;
  return `<article class="cosmetic-card ${equipped ? 'equipped' : ''} ${unlocked ? '' : 'locked'}">
    <div class="cosmetic-preview">
      <div class="avatar-sprite wardrobe-preview" data-preview-look="${item.code}">
        <img class="avatar-image" src="${item.asset}" alt="Preview do look ${escapeHtml(item.name)}">
        <span class="outfit-tint" aria-hidden="true"></span>
      </div>
      <span class="cosmetic-rarity">${equipped ? 'equipado' : unlocked ? 'disponível' : `nível ${item.level}`}</span>
    </div>
    <div class="cosmetic-copy">
      <h4>${escapeHtml(item.name)}</h4>
      <p>${escapeHtml(item.detail)}</p>
    </div>
    <button class="btn ${equipped ? 'secondary' : 'primary'} small" data-equip-look="${item.code}" ${!unlocked ? 'disabled' : ''}>${equipped ? 'equipado' : unlocked ? 'equipar' : 'bloqueado'}</button>
  </article>`;
}

function renderWardrobe() {
  const grid = $('#wardrobeGrid');
  if (!grid) return;
  const current = currentLookCode();
  const currentItem = COSMETIC_CATALOG.find(x => x.code === current) || COSMETIC_CATALOG[0];
  $('#equippedLookLabel').textContent = `equipado: ${currentItem.name}`;
  grid.innerHTML = COSMETIC_CATALOG.map(item => cosmeticPreviewMarkup(item, current)).join('');
  $$('.wardrobe-preview', grid).forEach(wrap => applyLookToSprite(wrap, wrap.dataset.previewLook));
}

async function equipCosmetic(code) {
  const item = COSMETIC_CATALOG.find(x => x.code === code);
  if (!item) return;
  if (!cosmeticUnlocked(item)) return showToast(`Esse look desbloqueia no nível ${item.level}.`, 'error');
  const { data, error } = await db.auth.updateUser({ data: { equipped_look: code } });
  if (error) return showToast(error.message, 'error');
  if (data?.user) state.user = data.user;
  setAvatarSources();
  renderWardrobe();
  showToast(`${item.name} equipado.`, 'success');
}
