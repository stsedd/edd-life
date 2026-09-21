/* Hotfix for modular avatar rendering. Uses the existing 2x2 sprite sheets as clipped IMG layers instead of CSS background crops. */
(function installWardrobeHotfix(){
  if (document.getElementById('edd-wardrobe-hotfix-v2')) return;
  const style = document.createElement('style');
  style.id = 'edd-wardrobe-hotfix-v2';
  style.textContent = `
    .avatar-sprite.modular-avatar{position:relative!important;aspect-ratio:160/249!important;overflow:visible!important}
    .avatar-layer{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important}
    .avatar-base-layer{object-fit:contain!important;object-position:center bottom!important;image-rendering:auto!important;z-index:1!important}
    .avatar-sprite-layer{overflow:hidden!important;background:none!important}
    .avatar-sheet{position:absolute!important;width:200%!important;height:200%!important;max-width:none!important;object-fit:fill!important;image-rendering:auto!important}
    .layer-pants{z-index:2!important}.layer-shirt{z-index:3!important}.layer-outerwear{z-index:4!important}.layer-hat{z-index:6!important}.layer-accessory{z-index:7!important}
    .piece-preview{height:185px!important;display:grid!important;place-items:end center!important;overflow:hidden!important;padding:7px 6px 0!important}
    .piece-preview-avatar{position:relative!important;width:104px!important;aspect-ratio:160/249!important;margin-bottom:2px!important}
    .piece-preview-avatar .avatar-base-layer{image-rendering:auto!important}
    .piece-name{font-size:12px!important;font-weight:800!important}
    .wardrobe-live-stage .avatar-sprite{width:min(230px,76%)!important}
    @media(max-width:560px){.piece-preview{height:170px!important}.piece-preview-avatar{width:96px!important}}
  `;
  document.head.appendChild(style);
})();

function spriteOffset(index=0){
  return [
    {left:'0%',top:'0%'},
    {left:'-100%',top:'0%'},
    {left:'0%',top:'-100%'},
    {left:'-100%',top:'-100%'}
  ][index] || {left:'0%',top:'0%'};
}

function sheetLayerMarkup(category,index){
  const pos=spriteOffset(index);
  const src=avatarAssets?.[category]||'';
  return `<span class="avatar-layer avatar-sprite-layer layer-${category}"><img class="avatar-sheet" src="${src}" alt="" style="left:${pos.left};top:${pos.top}"></span>`;
}

function avatarLayersMarkup(loadout=getAvatarLoadout()){
  let html=`<img class="avatar-layer avatar-base-layer" src="${avatarAssets.base}" alt="Edd em pixel art">`;
  for(const cat of ['pants','shirt','outerwear','hat','accessory']){
    const meta=itemMeta(cat,loadout[cat]);
    if(meta&&meta.code!=='none') html+=sheetLayerMarkup(cat,meta.index);
  }
  return html;
}

function renderAvatarStack(wrap,loadout=getAvatarLoadout()){
  if(!wrap)return;
  if(!avatarAssets){
    wrap.innerHTML='<span class="wardrobe-loading">carregando…</span>';
    ensureAvatarAssets().then(()=>renderAvatarStack(wrap,loadout));
    return;
  }
  wrap.classList.add('modular-avatar');
  wrap.innerHTML=avatarLayersMarkup(loadout);
}

function setAvatarSources(){
  const loadout=getAvatarLoadout();
  if(!avatarAssets){ensureAvatarAssets().then(setAvatarSources);return;}
  renderAvatarStack($('#homeAvatarWrap'),loadout);
  renderAvatarStack($('#sheetAvatarWrap'),loadout);
}

function previewLoadout(category,item){
  const preview={...DEFAULT_LOADOUT};
  if(item.code!=='none') preview[category]=item.code;
  return preview;
}

function pieceCardMarkup(category,item,current){
  const equipped=current===item.code;
  return `<article class="piece-card ${equipped?'equipped':''}">
    <div class="piece-preview">
      <span class="piece-status">${equipped?'equipado':'disponível'}</span>
      <div class="piece-preview-avatar">${avatarLayersMarkup(previewLoadout(category,item))}</div>
    </div>
    <div class="piece-name">${escapeHtml(item.name)}</div>
    <button class="btn ${equipped?'secondary':'primary'} small" data-equip-look="${category}:${item.code}">${equipped?'equipado':'equipar'}</button>
  </article>`;
}

function renderWardrobeItems(){
  const host=$('#wardrobeItems');
  if(!host||!avatarAssets)return;
  const loadout=getAvatarLoadout();
  host.innerHTML=categoryItems(wardrobeCategory).map(item=>pieceCardMarkup(wardrobeCategory,item,loadout[wardrobeCategory])).join('');
}
