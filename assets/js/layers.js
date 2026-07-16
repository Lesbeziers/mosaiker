// ============================================================
// LAYERS.JS — Panel "CAPAS" + imágenes superpuestas (logos / PNG de texto)
//
// Pila (de arriba a abajo, como en Adaptator):
//   · imágenes importadas (0..N)  → capas manejables (importar/duplicar/borrar,
//     reordenar en fase 2, 👁, seleccionar → manejadores en el lienzo)
//   · MOSAICO  → capa base fija (solo 👁 de visibilidad)
//   · FONDO    → capa base fija (solo 👁; su color/imagen siguen en la bottom-bar)
//
// Las imágenes viven en la COMPOSICIÓN (por formato) → se heredan al cambiar de
// formato. Coordenadas normalizadas (0..1) respecto al lienzo → idéntico en
// editor y export. El binario vive en la caché de Images bajo la clave
// "formatId::overlay::id" (mismo patrón que grupos/fondos).
// ============================================================

const Layers = (() => {

  let _selectedId = null;      // id de la capa-imagen seleccionada (o null)
  const _urls  = {};           // cacheKey → objectURL (para <img> de panel y lienzo)
  const _files = {};           // cacheKey → File (fuente directa para pintar; no
                               // depende de que la caché de Images esté lista)

  function init() {
    _wireToolbar();
    _wireCollapse();
    _wireDeselect();
    update();
  }

  // Llamada al cambiar de formato (desde Formats.setActive).
  function update() {
    _selectedId = null;
    _applyBaseVisibility();
    render();
  }

  // ── ACCESO A DATOS ────────────────────────────────────────
  function _comp() {
    if (typeof State === 'undefined' || !State.activeFormatId) return null;
    return State.compositions ? State.compositions[State.activeFormatId] : null;
  }
  function _overlays() {
    const c = _comp();
    if (!c) return [];
    if (!c.overlays) c.overlays = [];
    return c.overlays;
  }
  function _lienzo() { return document.getElementById('lienzo'); }
  function _layer()  { return document.getElementById('capas-layer'); }

  // objectURL para pintar una capa (memoizado). Fuente: el File que guardamos al
  // importar (_files); si no está (p.ej. capa heredada de otro formato), la caché
  // de Images (poblada por copyBinding). Así el pintado no depende del bind async.
  function _url(cacheKey) {
    if (_urls[cacheKey]) return _urls[cacheKey];
    let file = _files[cacheKey] || null;
    if (!file && typeof Images !== 'undefined' && Images.getOriginalFile) {
      file = Images.getOriginalFile(cacheKey);
    }
    if (!file) return null;
    const u = URL.createObjectURL(file);
    _urls[cacheKey] = u;
    return u;
  }

  // ── IMPORTAR / DUPLICAR / BORRAR ──────────────────────────
  let _fileInput = null;
  function _pickImage() {
    if (!_fileInput) {
      _fileInput = document.createElement('input');
      _fileInput.type = 'file';
      _fileInput.accept = 'image/*';
      _fileInput.style.display = 'none';
      _fileInput.addEventListener('change', () => {
        const f = _fileInput.files && _fileInput.files[0];
        if (f) _importFile(f);
        _fileInput.value = '';
      });
      document.body.appendChild(_fileInput);
    }
    _fileInput.click();
  }

  async function _importFile(file) {
    const comp = _comp();
    if (!comp) { alert('Selecciona antes un formato.'); return; }
    if (!/^image\//.test(file.type)) { alert('El archivo no es una imagen.'); return; }

    // Lee el aspecto natural para el tamaño inicial contenido.
    const ar = await _imageAspect(file).catch(() => 1);

    const ov = _overlays();
    const existing = ov.map(o => parseInt(String(o.id || '').replace(/[^0-9]/g, ''), 10) || 0);
    const id = 'ov' + ((existing.length ? Math.max(...existing) : 0) + 1);
    const cacheKey = State.activeFormatId + '::overlay::' + id;

    // Tamaño inicial: contenido dentro del lienzo (máx ~60% de cada lado).
    const w = _containedWidth(ar);

    const overlay = {
      id, image: file.name, cacheKey,
      x: 0.5, y: 0.5, w, ar,
      visible: true,
      name: _defaultName(file.name),
    };
    ov.push(overlay);
    _files[cacheKey] = file;   // los overlays se pintan/exportan/guardan del File
    _selectedId = id;
    render();
  }

  async function _duplicate() {
    const src = _find(_selectedId);
    if (!src) return;
    const ov = _overlays();
    const existing = ov.map(o => parseInt(String(o.id || '').replace(/[^0-9]/g, ''), 10) || 0);
    const id = 'ov' + ((existing.length ? Math.max(...existing) : 0) + 1);
    const cacheKey = State.activeFormatId + '::overlay::' + id;
    const copy = {
      id, image: src.image, cacheKey,
      x: Math.min(1, src.x + 0.04), y: Math.min(1, src.y + 0.04),
      w: src.w, ar: src.ar, visible: true, name: src.name + ' copia',
    };
    ov.push(copy);
    _files[cacheKey] = _files[src.cacheKey] || null;
    _selectedId = id;
    render();
  }

  function _remove(id) {
    const ov = _overlays();
    const i = ov.findIndex(o => o.id === id);
    if (i < 0) return;
    const o = ov[i];
    if (o && o.cacheKey) {
      if (_urls[o.cacheKey]) { URL.revokeObjectURL(_urls[o.cacheKey]); delete _urls[o.cacheKey]; }
      delete _files[o.cacheKey];
    }
    ov.splice(i, 1);
    if (_selectedId === id) _selectedId = null;
    render();
  }

  function _find(id) { return _overlays().find(o => o.id === id) || null; }

  function _select(id) {
    if (_selectedId === id) return;
    _selectedId = id;
    render();
  }

  // ── VISIBILIDAD ───────────────────────────────────────────
  function _toggleOverlay(id) {
    const o = _find(id);
    if (!o) return;
    o.visible = !o.visible;
    render();
  }
  function _toggleBase(which) {
    const c = _comp();
    if (!c) return;
    if (which === 'mosaico') c.mosaicVisible = !(c.mosaicVisible !== false);
    else                     c.bgVisible     = !(c.bgVisible !== false);
    _applyBaseVisibility();
    render();
  }
  // Aplica la visibilidad de las capas base (mosaico/fondo) al editor.
  function _applyBaseVisibility() {
    const c = _comp();
    const canvas = document.querySelector('.mosaic-canvas');
    if (canvas) canvas.style.display = (c && c.mosaicVisible === false) ? 'none' : 'block';
    if (typeof Background !== 'undefined' && Background.update) Background.update();
  }

  // ── RENDER ────────────────────────────────────────────────
  function render() { _renderList(); _renderCanvas(); }

  // Lista del panel: imágenes (de arriba=última a abajo=primera) + MOSAICO + FONDO.
  function _renderList() {
    const list = document.getElementById('capas-list');
    if (!list) return;
    list.innerHTML = '';
    const comp = _comp();
    if (!comp) return;

    // Capas-imagen, la última del array arriba del todo (encima en z).
    const ov = _overlays();
    for (let i = ov.length - 1; i >= 0; i--) {
      list.appendChild(_rowOverlay(ov[i]));
    }
    // Base MOSAICO (siempre). Base FONDO solo si hay imagen de fondo importada
    // (el color de fondo se gestiona en la bottom-bar, no es una "capa").
    list.appendChild(_rowBase('mosaico', 'MOSAICO', comp.mosaicVisible !== false, _mosaicThumb()));
    if (typeof Background !== 'undefined' && Background.hasImage && Background.hasImage()) {
      list.appendChild(_rowBase('fondo', 'FONDO', comp.bgVisible !== false, _fondoThumb()));
    }
  }

  function _rowOverlay(o) {
    const row = document.createElement('div');
    row.className = 'capa-row' + (o.id === _selectedId ? ' selected' : '');
    row.appendChild(_eye(o.visible, e => { e.stopPropagation(); _toggleOverlay(o.id); }));
    const thumb = document.createElement('div');
    thumb.className = 'capa-thumb';
    const url = _url(o.cacheKey);
    if (url) { const im = document.createElement('img'); im.src = url; thumb.appendChild(im); }
    row.appendChild(thumb);
    const name = document.createElement('span');
    name.className = 'capa-name';
    name.textContent = o.name || o.image;
    row.appendChild(name);
    row.addEventListener('click', () => _select(o.id));
    return row;
  }

  function _rowBase(kind, label, visible, thumbEl) {
    const row = document.createElement('div');
    row.className = 'capa-row capa-base';
    row.appendChild(_eye(visible, e => { e.stopPropagation(); _toggleBase(kind); }));
    row.appendChild(thumbEl);
    const name = document.createElement('span');
    name.className = 'capa-name';
    name.textContent = label;
    row.appendChild(name);
    return row;
  }

  function _eye(on, onClick) {
    const b = document.createElement('button');
    b.className = 'capa-eye' + (on ? '' : ' off');
    b.title = on ? 'Ocultar' : 'Mostrar';
    b.innerHTML = on
      ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 4.3l1.3-1.3 17.7 17.7-1.3 1.3-3.1-3.1A11 11 0 0112 19C7 19 3 14.5 2 12a12 12 0 013.6-4.6L2 4.3zM12 8a4 4 0 013.9 4.9l-4.8-4.8A4 4 0 0112 8z"/></svg>';
    b.addEventListener('click', onClick);
    return b;
  }

  function _mosaicThumb() {
    const t = document.createElement('div');
    t.className = 'capa-thumb';
    t.innerHTML =
      '<svg viewBox="0 0 40 28" width="40" height="28">' +
      '<rect x="3"  y="4"  width="9"  height="8" rx="1.5" fill="#3a3a3a"/>' +
      '<rect x="15" y="4"  width="9"  height="8" rx="1.5" fill="#4d4d4d"/>' +
      '<rect x="27" y="4"  width="10" height="8" rx="1.5" fill="#3a3a3a"/>' +
      '<rect x="3"  y="16" width="9"  height="8" rx="1.5" fill="#f0a500"/>' +
      '<rect x="15" y="16" width="9"  height="8" rx="1.5" fill="#3a3a3a"/>' +
      '<rect x="27" y="16" width="10" height="8" rx="1.5" fill="#4d4d4d"/>' +
      '</svg>';
    return t;
  }
  function _fondoThumb() {
    const t = document.createElement('div');
    t.className = 'capa-thumb';
    const url = (typeof Background !== 'undefined' && Background.getImageUrl) ? Background.getImageUrl() : null;
    if (url) { const im = document.createElement('img'); im.src = url; t.appendChild(im); }
    else { t.style.background = (typeof Background !== 'undefined') ? Background.get() : '#0e0e0e'; }
    return t;
  }

  // Capa sobre el lienzo: un <img> por overlay visible + marco/manejadores en la seleccionada.
  function _renderCanvas() {
    const layer = _layer();
    if (!layer) return;
    layer.innerHTML = '';
    _overlays().forEach(o => {
      if (!o.visible) return;
      const item = document.createElement('div');
      item.className = 'capa-item' + (o.id === _selectedId ? ' selected' : '');
      item.dataset.id = o.id;
      const url = _url(o.cacheKey);
      if (url) { const im = document.createElement('img'); im.src = url; im.draggable = false; item.appendChild(im); }
      _positionItem(o, item);
      // mover
      item.addEventListener('mousedown', e => { if (e.button === 0) _startMove(e, o); });
      // manejadores (solo seleccionada)
      if (o.id === _selectedId) {
        ['tl','tr','bl','br'].forEach(c => {
          const h = document.createElement('div');
          h.className = 'capa-handle ' + c;
          h.addEventListener('mousedown', e => { if (e.button === 0) _startScale(e, o); });
          item.appendChild(h);
        });
      }
      layer.appendChild(item);
    });
  }

  function _positionItem(o, item) {
    const el = item || (_layer() && _layer().querySelector('.capa-item[data-id="' + o.id + '"]'));
    if (!el) return;
    el.style.left = (o.x * 100) + '%';
    el.style.top  = (o.y * 100) + '%';
    el.style.width = (o.w * 100) + '%';
    el.style.aspectRatio = String(o.ar || 1);
  }

  // ── GESTOS ────────────────────────────────────────────────
  function _startMove(e, o) {
    e.preventDefault(); e.stopPropagation();
    _select(o.id);
    const lz = _lienzo().getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
    const onMove = ev => {
      o.x = Math.min(1, Math.max(0, ox + (ev.clientX - sx) / lz.width));
      o.y = Math.min(1, Math.max(0, oy + (ev.clientY - sy) / lz.height));
      _positionItem(o);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }

  function _startScale(e, o) {
    e.preventDefault(); e.stopPropagation();
    _select(o.id);
    const lz = _lienzo().getBoundingClientRect();
    const cx = lz.left + o.x * lz.width;    // centro fijo → escala uniforme desde el centro
    const onMove = ev => {
      const wPx = 2 * Math.abs(ev.clientX - cx);
      o.w = Math.min(3, Math.max(0.03, wPx / lz.width));
      _positionItem(o);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }

  // Clic en zona vacía del lienzo (no sobre una capa) → deseleccionar.
  function _wireDeselect() {
    const lz = _lienzo();
    if (!lz) return;
    lz.addEventListener('mousedown', e => {
      if (e.target.closest && e.target.closest('.capa-item')) return; // lo maneja la capa
      if (_selectedId !== null) { _selectedId = null; render(); }
    });
  }

  // ── UTILIDADES ────────────────────────────────────────────
  function _imageAspect(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { const ar = im.naturalWidth / im.naturalHeight; URL.revokeObjectURL(url); resolve(ar || 1); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      im.src = url;
    });
  }

  // Ancho normalizado para que la imagen quepa en ~60% del lienzo sin desbordar.
  function _containedWidth(ar) {
    const lz = _lienzo();
    const lw = lz ? lz.clientWidth  : 1000;
    const lh = lz ? lz.clientHeight : 1000;
    const maxW = 0.6 * lw, maxH = 0.6 * lh;
    let dispW = maxW, dispH = dispW / ar;
    if (dispH > maxH) { dispH = maxH; dispW = dispH * ar; }
    return Math.max(0.05, Math.min(1, dispW / lw));
  }

  function _defaultName(filename) {
    return String(filename).replace(/\.[^.]+$/, '');
  }

  // ── TOOLBAR / COLLAPSE ────────────────────────────────────
  const _ICON = {
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 011-1h10"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  };
  function _wireToolbar() {
    const add = document.getElementById('capas-add');
    const dup = document.getElementById('capas-dup');
    const del = document.getElementById('capas-del');
    if (add) { add.innerHTML = _ICON.add; add.addEventListener('click', _pickImage); }
    if (dup) { dup.innerHTML = _ICON.dup; dup.addEventListener('click', _duplicate); }
    if (del) { del.innerHTML = _ICON.del; del.addEventListener('click', () => { if (_selectedId) _remove(_selectedId); }); }
  }
  function _wireCollapse() {
    const head = document.getElementById('capas-header');
    const sec  = document.getElementById('section-capas');
    head?.addEventListener('click', () => sec?.classList.toggle('collapsed'));
  }

  // Acceso al binario de una capa (por cacheKey) para export y guardado; y
  // registro directo (lo usa la herencia entre formatos y la carga de proyecto).
  function getFile(cacheKey) { return _files[cacheKey] || null; }
  function setFile(cacheKey, file) { if (cacheKey && file) _files[cacheKey] = file; }

  return { init, update, getFile, setFile };
})();
