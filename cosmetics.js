const AVATAR_ASSET_PATH = 'assets/edd.webp';

const COSMETIC_CATALOG = [
  { code:'explorer', name:'Explorador de Café', tint:'transparent', opacity:0, unlock:'starter', detail:'Look base · jaqueta marrom e bolsa lateral.' },
  { code:'noir', name:'Noir Urbano', tint:'#20242b', opacity:.64, unlock:'starter', detail:'Versão escura para dias mais minimalistas.' },
  { code:'crimson', name:'Carmesim', tint:'#7d2940', opacity:.64, unlock:'starter', detail:'Casaco em vermelho profundo, inspirado no seu look de alfaiataria.' },
  { code:'moss', name:'Caminhante de Musgo', tint:'#56694c', opacity:.60, unlock:'level', level:5, detail:'Desbloqueia no nível 5.' }
];

function currentLookCode() {
  return state.user?.user_metadata?.equipped_look || 'explorer';
}
function cosmeticUnlocked(item) {
  if (item.unlock === 'starter') return true;
  if (item.unlock === 'level') return computeLevel(totalXp()).level >= item.level;
  return false;
}
function applyLookToSprite(wrap, code) {
  if (!wrap) return;
  const item = COSMETIC_CATALOG.find(x=>x.code===code) || COSMETIC_CATALOG[0];
  wrap.dataset.look = item.code;
  wrap.style.setProperty('--look-color', item.tint);
  wrap.style.setProperty('--look-opacity', String(item.opacity));
  const img = wrap.querySelector('img');
  const tint = wrap.querySelector('.outfit-tint');
  if (img) {
    img.src = AVATAR_ASSET_PATH;
    img.onerror = () => {
      img.removeAttribute('src');
      wrap.classList.add('asset-fallback');
    };
  }
  if (tint) {
    tint.style.webkitMaskImage = `url("${AVATAR_ASSET_PATH}")`;
    tint.style.maskImage = `url("${AVATAR_ASSET_PATH}")`;
  }
}
function setAvatarSources() {
  const code = currentLookCode();
  applyLookToSprite($('#homeAvatarWrap'), code);
  applyLookToSprite($('#sheetAvatarWrap'), code);
}
function cosmeticPreviewMarkup(item, current) {
  const unlocked = cosmeticUnlocked(item);
  const equipped = current === item.code;
  return `<article class="cosmetic-card ${equipped?'equipped':''} ${unlocked?'':'locked'}">
    <div class="cosmetic-preview">
      <div class="avatar-sprite wardrobe-preview" data-preview-look="${item.code}">
        <img class="avatar-image" src="${AVATAR_ASSET_PATH}" alt="Preview do look ${escapeHtml(item.name)}">
        <span class="outfit-tint" aria-hidden="true"></span>
      </div>
      <span class="cosmetic-rarity">${equipped?'equipado':unlocked?'disponível':`nível ${item.level}`}</span>
    </div>
    <div class="cosmetic-copy">
      <h4>${escapeHtml(item.name)}</h4>
      <p>${escapeHtml(item.detail)}</p>
    </div>
    <button class="btn ${equipped?'secondary':'primary'} small" data-equip-look="${item.code}" ${!unlocked?'disabled':''}>${equipped?'equipado':unlocked?'equipar':'bloqueado'}</button>
  </article>`;
}
function renderWardrobe() {
  const grid = $('#wardrobeGrid'); if (!grid) return;
  const current = currentLookCode();
  const currentItem = COSMETIC_CATALOG.find(x=>x.code===current) || COSMETIC_CATALOG[0];
  $('#equippedLookLabel').textContent = `equipado: ${currentItem.name}`;
  grid.innerHTML = COSMETIC_CATALOG.map(item=>cosmeticPreviewMarkup(item,current)).join('');
  $$('.wardrobe-preview', grid).forEach(wrap=>applyLookToSprite(wrap, wrap.dataset.previewLook));
}
async function equipCosmetic(code) {
  const item = COSMETIC_CATALOG.find(x=>x.code===code); if (!item) return;
  if (!cosmeticUnlocked(item)) return showToast(`Esse look desbloqueia no nível ${item.level}.`, 'error');
  const { data, error } = await db.auth.updateUser({ data: { equipped_look: code } });
  if (error) return showToast(error.message, 'error');
  if (data?.user) state.user = data.user;
  setAvatarSources(); renderWardrobe();
  showToast(`${item.name} equipado.`, 'success');
}
