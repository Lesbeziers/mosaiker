// ============================================================
// FORMATS.JS — Catálogo de formatos y dropdown de selección
// ============================================================

const Formats = (() => {

  // Cada formato puede tener un array opcional de overlays:
  //   overlays: [
  //     { id, label, src, blend? }, ...
  //   ]
  // El orden del array determina el stacking visual: primero abajo, último arriba.
  // El campo `blend` es opcional (CSS mix-blend-mode: 'screen', 'multiply', etc.)
  const FORMATS = [
    { id: 'cabecera_detalle_desktop',          name: 'Cabecera detalle desktop',          width: 3840, height: 2160,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_det_des_zse.png' },
      ] },
    { id: 'cabecera_detalle_movil',            name: 'Cabecera detalle móvil',            width: 2160, height: 3840,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_det_mov_zse.png' },
      ] },
    { id: 'landing_central',                   name: 'Landing central',                   width: 3840, height: 2160,
      overlays: [
        { id: 'mok_des', label: 'Mockup desktop', src: 'assets/img/checks/lan_cen_mok_des.png', blend: 'screen',
          group: 'landing_mok', defaultOn: true },
        { id: 'mok_mov', label: 'Mockup móvil',   src: 'assets/img/checks/lan_cen_mok_mov.png',
          group: 'landing_mok' },
      ] },
    { id: 'cabecera_newsletters',              name: 'Cabecera newsletters',              width: 600,  height: 400  },
    { id: 'cabecera_slider_desktop',           name: 'Cabecera slider desktop',           width: 3840, height: 2160,
      overlays: [
        { id: 'mok', label: 'Mockup',            src: 'assets/img/checks/cab_sli_des_mok.png', blend: 'screen' },
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_des_zse.png' },
      ] },
    { id: 'cabecera_slider_movil',             name: 'Cabecera slider móvil',             width: 2160, height: 3840,
      overlays: [
        { id: 'mok', label: 'Mockup',            src: 'assets/img/checks/cab_sli_mov_mok.png' },
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_mov_zse.png' },
      ] },
    { id: 'cabecera_slider_mediano_desktop',   name: 'Cabecera slider mediano desktop',   width: 3840, height: 1200,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_med_des_zse.png' },
      ] },
    { id: 'cabecera_slider_mediano_movil',     name: 'Cabecera slider mediano móvil',     width: 1536, height: 1536,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_med_mov_zse.png' },
      ] },
    { id: 'slider_mediano_desktop',            name: 'Slider mediano desktop',            width: 3840, height: 1200,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/sli_med_des_zse.png' },
      ] },
    { id: 'slider_mediano_movil',              name: 'Slider mediano móvil',              width: 1536, height: 1536,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/sli_med_mov_zse.png' },
      ] },
  ];

  function init() {
    _buildDropdown();
    _bindDropdown();
  }

  function getAll() {
    return FORMATS;
  }

  function getById(id) {
    if (id === 'custom') return _customFormat();
    return FORMATS.find(f => f.id === id) || null;
  }

  // Formato custom sintetizado desde State.customFormat. Sin overlays (no hay
  // zona de seguridad para tamaños arbitrarios).
  function _customFormat() {
    const c = State.customFormat;
    if (!c || !c.width || !c.height) return null;
    return { id: 'custom', name: 'Custom', width: c.width, height: c.height, overlays: [], custom: true };
  }

  function getActive() {
    return State.activeFormatId ? getById(State.activeFormatId) : null;
  }

  // Transform por defecto de una composición nueva (mismos valores que el
  // estado inicial del editor).
  function _defaultTransform() {
    return { rotX: 35, rotY: 0, camX: 0, camY: 0, camZ: 10, gap: 8, radius: 12, colOffsets: [] };
  }

  // Devuelve (creando si hace falta) la composición de un formato.
  function ensureComposition(id) {
    if (!id) return null;
    if (!State.compositions[id]) {
      State.compositions[id] = {
        skeletonId:      State.defaultSkeletonId || null,
        transform:       _defaultTransform(),
        imageAdjust:     {},
        containerImages: {},
        cellOpacity:     {},     // opacidad por celda (override del diseño), clave = cellKey
        cellBorder:      {},     // borde on/off por celda (override del diseño)
        cellBorderColor: {},     // color de borde por celda (override)
        cellBorderWidth: {},     // grosor de borde por celda (override)
        cellShadow:      {},     // sombra on/off por celda (override)
        cellShadowOpacity: {},   // opacidad de sombra por celda
        cellShadowX:     {},     // offset X de sombra por celda
        cellShadowY:     {},     // offset Y de sombra por celda
        cellShadowBlur:  {},     // desenfoque de sombra por celda
        cellGlow:        {},     // glow on/off por celda
        cellGlowColor:   {},     // color de glow por celda
        cellGlowIntensity: {},   // intensidad de glow por celda
        cellGlowBlur:    {},     // desenfoque de glow por celda
        groups:          [],
        overlays:        [],     // capas-imagen (logos / PNG de texto), por formato
        bgVisible:       true,   // visibilidad de la capa base FONDO
        mosaicVisible:   true,   // visibilidad de la capa base MOSAICO
        fitted:          false,
      };
    }
    return State.compositions[id];
  }

  // Hereda en `dst` una copia INDEPENDIENTE de la composición `src` (la del
  // formato del que venimos): mosaico + encuadre/estilo + encuadres por celda +
  // imágenes vinculadas + grupos. Así, al entrar por primera vez a un formato,
  // ves tu trabajo listo para readaptarlo, y puedes divergir sin tocar el
  // original. Las imágenes viven por formato (formatId::n / formatId::group::id);
  // se duplican en la caché a las claves del nuevo formato (asíncrono).
  function _inheritFrom(dst, src, srcFid, dstFid) {
    dst.skeletonId = src.skeletonId;
    // Copia el encuadre/estilo, pero fitted=false → applyFormat reajusta la
    // cámara (camX/Y/Z) al tamaño del nuevo formato, conservando rotación,
    // separación, esquinas y offsets de columna.
    dst.transform   = JSON.parse(JSON.stringify(src.transform || _defaultTransform()));
    dst.fitted      = false;
    dst.imageAdjust = JSON.parse(JSON.stringify(src.imageAdjust || {}));
    dst.containerImages = { ...(src.containerImages || {}) };
    dst.cellOpacity = { ...(src.cellOpacity || {}) };
    dst.cellBorder      = { ...(src.cellBorder || {}) };
    dst.cellBorderColor = { ...(src.cellBorderColor || {}) };
    dst.cellBorderWidth = { ...(src.cellBorderWidth || {}) };
    dst.cellShadow        = { ...(src.cellShadow || {}) };
    dst.cellShadowOpacity = { ...(src.cellShadowOpacity || {}) };
    dst.cellShadowX       = { ...(src.cellShadowX || {}) };
    dst.cellShadowY       = { ...(src.cellShadowY || {}) };
    dst.cellShadowBlur    = { ...(src.cellShadowBlur || {}) };
    dst.cellGlow          = { ...(src.cellGlow || {}) };
    dst.cellGlowColor     = { ...(src.cellGlowColor || {}) };
    dst.cellGlowIntensity = { ...(src.cellGlowIntensity || {}) };
    dst.cellGlowBlur      = { ...(src.cellGlowBlur || {}) };
    dst.groups = (src.groups || []).map(g => ({
      id:        g.id,
      cells:     [...(g.cells || [])],
      image:     g.image,
      cacheKey:  dstFid + '::group::' + g.id,
      transform: { ...(g.transform || { dx: 0, dy: 0, scale: 1 }) },
    }));
    // Capas-imagen (logos): copia profunda + re-mapeo de cacheKey al nuevo formato.
    dst.overlays = (src.overlays || []).map(o => ({
      id:      o.id,
      image:   o.image,
      cacheKey: dstFid + '::overlay::' + o.id,
      x: o.x, y: o.y, w: o.w, ar: o.ar,
      visible: o.visible !== false,
      name:    o.name,
    }));
    // Los overlays viven del File (no de la caché WebGL): copia la referencia a la
    // clave del nuevo formato de forma SÍNCRONA → se pintan al instante.
    if (typeof Layers !== 'undefined' && Layers.getFile && Layers.setFile) {
      (src.overlays || []).forEach(o => {
        const f = Layers.getFile(o.cacheKey);
        if (f) Layers.setFile(dstFid + '::overlay::' + o.id, f);
      });
    }
    dst.bgVisible     = src.bgVisible !== false;
    dst.mosaicVisible = src.mosaicVisible !== false;

    // Duplica las entradas de caché de imágenes a las claves del nuevo formato.
    if (typeof Images !== 'undefined' && Images.copyBinding) {
      const jobs = [];
      Object.keys(src.containerImages || {}).forEach(n => {
        jobs.push(Images.copyBinding(srcFid + '::' + n, dstFid + '::' + n));
      });
      (src.groups || []).forEach(g => {
        jobs.push(Images.copyBinding(g.cacheKey, dstFid + '::group::' + g.id));
      });
      if (jobs.length) {
        Promise.all(jobs).then(() => {
          // Solo refresca si seguimos en el formato heredado.
          if (State.activeFormatId !== dstFid) return;
          if (typeof Mosaic3D !== 'undefined' && Mosaic3D.refreshTextures) Mosaic3D.refreshTextures();
          // Las capas-imagen ya tienen su binario copiado → re-render para pintarlas.
          if (typeof Layers !== 'undefined' && Layers.update) Layers.update();
        });
      }
    }
  }

  function setActive(id) {
    const fmt = getById(id);
    if (!fmt) return;
    const prevId    = State.activeFormatId;
    const isNewComp = !State.compositions[id];
    State.activeFormatId = id;

    // Composición de ESTE formato + intercambio de punteros activos.
    const comp = ensureComposition(id);
    if (!comp.groups) comp.groups = [];       // compat composiciones antiguas
    if (!comp.overlays) comp.overlays = [];   // compat: capas-imagen

    // Primera visita a este formato viniendo de otro con trabajo → hereda una
    // copia (imágenes + encuadre + grupos) para readaptarla a este formato.
    if (isNewComp && prevId && prevId !== id && State.compositions[prevId]) {
      _inheritFrom(comp, State.compositions[prevId], prevId, id);
    }
    State.transform        = comp.transform;
    State.imageAdjust      = comp.imageAdjust;
    State.containerImages  = comp.containerImages;
    if (!comp.cellOpacity) comp.cellOpacity = {};   // compat composiciones antiguas
    State.cellOpacity      = comp.cellOpacity;
    if (!comp.cellBorder)      comp.cellBorder = {};       // compat
    if (!comp.cellBorderColor) comp.cellBorderColor = {};
    if (!comp.cellBorderWidth) comp.cellBorderWidth = {};
    State.cellBorder       = comp.cellBorder;
    State.cellBorderColor  = comp.cellBorderColor;
    State.cellBorderWidth  = comp.cellBorderWidth;
    if (!comp.cellShadow)        comp.cellShadow = {};       // compat: sombra por celda
    if (!comp.cellShadowOpacity) comp.cellShadowOpacity = {};
    if (!comp.cellShadowX)       comp.cellShadowX = {};
    if (!comp.cellShadowY)       comp.cellShadowY = {};
    if (!comp.cellShadowBlur)    comp.cellShadowBlur = {};
    State.cellShadow        = comp.cellShadow;
    State.cellShadowOpacity = comp.cellShadowOpacity;
    State.cellShadowX       = comp.cellShadowX;
    State.cellShadowY       = comp.cellShadowY;
    State.cellShadowBlur    = comp.cellShadowBlur;
    if (!comp.cellGlow)          comp.cellGlow = {};       // compat: glow por celda
    if (!comp.cellGlowColor)     comp.cellGlowColor = {};
    if (!comp.cellGlowIntensity) comp.cellGlowIntensity = {};
    if (!comp.cellGlowBlur)      comp.cellGlowBlur = {};
    State.cellGlow          = comp.cellGlow;
    State.cellGlowColor     = comp.cellGlowColor;
    State.cellGlowIntensity = comp.cellGlowIntensity;
    State.cellGlowBlur      = comp.cellGlowBlur;
    State.groups           = comp.groups;
    State.activeSkeletonId = comp.skeletonId;

    _updateTrigger(fmt);
    _markSelectedOption(id);
    Canvas.setFormat(fmt);   // dimensiona lienzo + Mosaic3D.resize()
    if (typeof Overlays      !== 'undefined') Overlays.update();
    if (typeof Vignettes     !== 'undefined') Vignettes.update();
    if (typeof MosaicOpacity !== 'undefined') MosaicOpacity.update();
    if (typeof MosaicBlur    !== 'undefined') MosaicBlur.update();
    if (typeof StacksBorder  !== 'undefined') StacksBorder.update();
    if (typeof Shadow        !== 'undefined') Shadow.update();
    if (typeof Glow          !== 'undefined') Glow.update();
    if (typeof Background    !== 'undefined') Background.update();
    // Aplica el mosaico + transform de este formato (auto-encuadre la 1ª vez,
    // restaura el encuadre guardado las siguientes).
    if (typeof Mosaic3D      !== 'undefined') Mosaic3D.applyFormat(comp);
    // Panel CAPAS + capas-imagen sobre el lienzo de este formato.
    if (typeof Layers        !== 'undefined') Layers.update();
    // Control contextual de opacidad por carátula (según la selección).
    if (typeof CellOpacity   !== 'undefined') CellOpacity.update();
    // Toolbar de la bottom-bar (dim contextual de botones).
    if (typeof Toolbar       !== 'undefined' && Toolbar.update) Toolbar.update();
    // Etiqueta del botón de mosaico + sliders + offsets según este formato.
    if (typeof Skeletons     !== 'undefined' && Skeletons.refreshActiveLabel) Skeletons.refreshActiveLabel();
    if (typeof UI            !== 'undefined') {
      if (UI.syncTransformSliders) UI.syncTransformSliders();
      if (UI.renderColOffsets)     UI.renderColOffsets();
      if (UI.updateOkButton)       UI.updateOkButton();
    }
  }

  // ── PRIVADAS ──────────────────────────────────────────────

  function _buildDropdown() {
    const optionsEl = document.getElementById('format-options');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';

    FORMATS.forEach(f => optionsEl.appendChild(_optionEl(f.id, f.name, `${f.width} × ${f.height}`)));

    // Opción CUSTOM (siempre presente, al final). Muestra el tamaño si ya existe.
    const c = State.customFormat;
    const csize = (c && c.width && c.height) ? `${c.width} × ${c.height}` : 'definir…';
    optionsEl.appendChild(_optionEl('custom', 'CUSTOM', csize));
  }

  // Opción del dropdown: nombre (izq) + tamaño A × B (der, atenuado).
  function _optionEl(id, name, size) {
    const opt = document.createElement('div');
    opt.className = 'custom-select-option';
    opt.dataset.id = id;
    opt.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:10px;';
    const n = document.createElement('span');
    n.textContent = name;
    n.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const s = document.createElement('span');
    s.textContent = size;
    s.style.cssText = 'flex-shrink:0;font-size:9px;font-weight:400;letter-spacing:0;text-transform:none;color:#777;';
    opt.appendChild(n);
    opt.appendChild(s);
    return opt;
  }

  function _refreshDropdown() {
    _buildDropdown();
    if (State.activeFormatId) _markSelectedOption(State.activeFormatId);
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('format-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('format-options');
    if (!dropdown || !trigger || !optionsEl) return;

    trigger.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    optionsEl.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select-option');
      if (!opt) return;
      dropdown.classList.remove('open');
      // Seleccionar CUSTOM siempre abre la modal de tamaño (también para re-editar).
      if (opt.dataset.id === 'custom') { _openCustomModal(); return; }
      setActive(opt.dataset.id);
    });
  }

  function _updateTrigger(fmt) {
    const valueEl = document.getElementById('format-value');
    if (!valueEl || !fmt) return;
    valueEl.textContent = (fmt.id === 'custom')
      ? `Custom — ${fmt.width} × ${fmt.height}`
      : fmt.name;
  }

  function _markSelectedOption(id) {
    document.querySelectorAll('#format-options .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.id === id);
    });
  }

  // ── MODAL DE FORMATO CUSTOM ───────────────────────────────
  function _openCustomModal() {
    document.getElementById('custom-format-modal')?.remove();
    const cur = State.customFormat || { width: 1920, height: 1080 };

    const overlay = document.createElement('div');
    overlay.id = 'custom-format-modal';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.width = '360px';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = 'Formato personalizado';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.className = 'modal-desc';
    desc.textContent = 'Introduce el tamaño en píxeles (máx. 8000 × 8000).';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;';
    const mkField = (labelTxt, val) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'flex:1;display:flex;flex-direction:column;';
      const lab = document.createElement('label');
      lab.className = 'modal-label';
      lab.textContent = labelTxt;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className = 'modal-input';
      inp.min = '1'; inp.max = '8000'; inp.step = '1'; inp.value = val;
      inp.style.marginBottom = '0';
      wrap.appendChild(lab); wrap.appendChild(inp);
      return { wrap, inp };
    };
    const wF = mkField('Ancho (px)', cur.width);
    const hF = mkField('Alto (px)',  cur.height);
    row.appendChild(wF.wrap); row.appendChild(hF.wrap);

    const err = document.createElement('p');
    err.className = 'modal-desc';
    err.style.cssText = 'color:#e0322d;min-height:14px;margin:2px 0 0;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:6px;';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-cancel';
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.alignSelf = 'auto';
    btnCancel.addEventListener('click', () => overlay.remove());
    const btnOk = document.createElement('button');
    btnOk.textContent = 'Aceptar';
    btnOk.style.cssText = 'height:28px;padding:0 20px;border-radius:2px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;background:var(--col-yellow);border:1px solid var(--col-yellow);color:#000;';

    const apply = () => {
      const w = Math.round(parseFloat(wF.inp.value));
      const h = Math.round(parseFloat(hF.inp.value));
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
        err.textContent = 'Introduce números válidos.'; return;
      }
      if (w > 8000 || h > 8000) { err.textContent = 'Máximo 8000 × 8000 px.'; return; }
      State.customFormat = { width: w, height: h };
      _buildDropdown();          // refresca el tamaño mostrado en la opción CUSTOM
      overlay.remove();
      setActive('custom');
    };
    btnOk.addEventListener('click', apply);
    [wF.inp, hF.inp].forEach(i => i.addEventListener('keydown', e => {
      if (e.key === 'Enter')  apply();
      if (e.key === 'Escape') overlay.remove();
    }));

    btnRow.appendChild(btnCancel); btnRow.appendChild(btnOk);
    body.appendChild(desc); body.appendChild(row); body.appendChild(err); body.appendChild(btnRow);
    modal.appendChild(header); modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(() => { wF.inp.focus(); wF.inp.select(); }, 50);
  }

  return { init, getAll, getById, getActive, setActive, ensureComposition, refresh: _refreshDropdown };
})();
