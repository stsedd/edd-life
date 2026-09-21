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
