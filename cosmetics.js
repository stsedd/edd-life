const COSMETIC_CATALOG = [
  { code:'explorer', name:'Explorador de Café', asset:'assets/look-explorer.svg', unlock:'starter', detail:'Look base · jaqueta marrom, bolsa lateral e vibe de campanha.' },
  { code:'noir', name:'Noir Urbano', asset:'assets/look-noir.svg', unlock:'starter', detail:'Versão mais escura, com silhueta limpa para dias minimalistas.' },
  { code:'crimson', name:'Carmesim', asset:'assets/look-crimson.svg', unlock:'starter', detail:'Blazer em vermelho profundo, inspirado no seu look de alfaiataria.' },
  { code:'moss', name:'Caminhante de Musgo', asset:'assets/look-moss.svg', unlock:'level', level:5, detail:'Manto verde e pin botânico. Desbloqueia no nível 5.' }
];

function currentLookCode() {
  return state.user?.user_metadata?.equipped_look || 'explorer';
}
function currentLookItem(code=currentLookCode()) {
  return COSMETIC_CATALOG.find(x=>x.code===code) || COSMETIC_CATALOG[0];
}
function cosmeticUnlocked(item) {
  if (item.unlock === 'starter') return true;
  if (item.unlock === 'level') return computeLevel(totalXp()).level >= item.level;
  return false;
}
function setSpriteAsset(wrap, assetPath){
  if (!wrap) return;
  const img = wrap.querySelector('img');
  if (img) {
    img.src = assetPath;
    img.loading = 'eager';
    img.decoding = 'async';
  }
}
function setAvatarSources() {
  const item = currentLookItem();
  setSpriteAsset($('#homeAvatarWrap'), item.asset);
  setSpriteAsset($('#sheetAvatarWrap'), item.asset);
}
function cosmeticPreviewMarkup(item, current) {
  const unlocked = cosmeticUnlocked(item);
  const equipped = current === item.code;
  return `<article class="cosmetic-card ${equipped?'equipped':''} ${unlocked?'':'locked'}">
    <div class="cosmetic-preview">
      <img class="wardrobe-thumb" src="${item.asset}" alt="Preview do look ${escapeHtml(item.name)}" loading="lazy">
      <span class="cosmetic-rarity">${equipped?'equipado':unlocked?'disponível':`nível ${item.level}`}</span>
    </div>
    <div class="cosmetic-copy">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.detail)}</p>
      </div>
      <button class="btn ${equipped?'secondary':'primary'} small" data-equip-look="${item.code}" ${!unlocked?'disabled':''}>${equipped?'equipado':unlocked?'equipar':'bloqueado'}</button>
    </div>
  </article>`;
}
function renderWardrobe() {
  const grid = $('#wardrobeGrid'); if (!grid) return;
  const current = currentLookCode();
  const currentItem = currentLookItem(current);
  $('#equippedLookLabel').textContent = `equipado: ${currentItem.name}`;
  grid.innerHTML = COSMETIC_CATALOG.map(item=>cosmeticPreviewMarkup(item,current)).join('');
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
