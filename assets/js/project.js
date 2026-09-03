// ============================================================
// PROJECT.JS — Guardar / abrir proyecto
//
// Dos modos de guardado (modal estilo Adaptator):
//   - ZIP completo (.mosaiker.zip): config + imágenes binarias originales
//   - JSON sólo (.mosaiker.json): sólo configuración, sin imágenes
//
// El JSON serializa todo el estado restaurable: formato/esqueleto activos,
// transforms, overlays, viñetas, OKs, snapshots y el mapping prefijo→nombre
// de archivo de cada imagen cargada.
// ============================================================

const Project = (() => {

  const VERSION = 1;

  function init() {
    document.getElementById('btn-guardar')?.addEventListener('click', _showSaveModal);
    document.getElementById('btn-abrir')  ?.addEventListener('click', open);
  }

  // ── ABRIR PROYECTO ────────────────────────────────────────

  // Abrir = SOLO desde carpeta (JSON + carpeta imagenes/ sueltos). El selector
  // se abre directamente, sin modal de elección. Para reabrir un proyecto
  // guardado en ZIP, primero se descomprime y se abre la carpeta resultante
  // (esto permite además editar el JSON o cambiar/añadir assets a mano).
  function open() {
    _openFromFolder();
  }

  function _openFromFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    // webkitdirectory hace que el picker seleccione una carpeta entera.
    // Soportado en Chrome, Edge, Safari (15+) y Firefox.
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.multiple = true;
    input.addEventListener('change', async e => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      try {
        await _loadFromFolder(files);
      } catch (err) {
        console.error('[Mosaiker] Error abriendo carpeta:', err);
        alert('No se pudo abrir la carpeta:\n' + (err.message || err));
      }
    });
    input.click();
  }

  // Sanitizado idéntico al del guardado (para reconstruir rutas).
  function _san(s) { return String(s).replace(/[^a-z0-9]+/gi, '_'); }

  // Imágenes vinculadas a partir de las COMPOSICIONES (siempre presentes), sin
  // depender del manifest boundImages (que solo lo escribe el guardado ZIP).
  // Usa el manifest como pista de ruta si existe; si no, reconstruye la ruta.
  // Cada entrada lleva su clave de caché + un PREFIJO de ruta basado SOLO en la
  // clave del contenedor (los archivos se nombran `bound/<clave>__<original>`),
  // de modo que se emparejan ignorando el nombre original (que puede estar
  // desincronizado). El manifest, si existe, se usa como atajo.
  function _boundEntries(data) {
    const manifest = data.boundImages || {};
    const out = [];
    Object.entries(State.compositions || {}).forEach(([fid, c]) => {
      Object.keys(c.containerImages || {}).forEach((slotKey) => {
        const cacheKey = fid + '::' + slotKey;
        out.push({ cacheKey, manifestPath: manifest[cacheKey] || null, prefix: 'bound/' + _san(cacheKey) + '__' });
      });
    });
    return out;
  }

  // Imágenes de los "contenedores virtuales" (grupos de celdas). Cada grupo
  // guarda su imagen bajo su cacheKey, igual que las vinculadas por contenedor.
  function _groupEntries(data) {
    const manifest = data.groupImages || {};
    const out = [];
    Object.entries(State.compositions || {}).forEach(([fid, c]) => {
      (c.groups || []).forEach((g) => {
        if (!g.cacheKey || !g.image) return;
        out.push({ cacheKey: g.cacheKey, manifestPath: manifest[g.cacheKey] || null, prefix: 'group/' + _san(g.cacheKey) + '__' });
      });
    });
    return out;
  }

  // Fondos por formato desde State.backgroundImages (siempre presente).
  function _bgEntries(data) {
    const manifest = data.bgImages || {};
    const out = [];
    Object.keys(State.backgroundImages || {}).forEach((fid) => {
      out.push({ fid, manifestPath: manifest[fid] || null, prefix: 'bg/' + _san(fid) + '__' });
    });
    return out;
  }

  // Capas-imagen (logos) desde las composiciones. Cada overlay guarda su imagen
  // bajo su cacheKey (formatId::overlay::id), igual que grupos/vinculadas.
  function _overlayEntries(data) {
    const manifest = data.overlayImages || {};
    const out = [];
    Object.entries(State.compositions || {}).forEach(([fid, c]) => {
      (c.overlays || []).forEach((o) => {
        if (!o.cacheKey) return;
        out.push({ cacheKey: o.cacheKey, manifestPath: manifest[o.cacheKey] || null, prefix: 'overlay/' + _san(o.cacheKey) + '__' });
      });
    });
    return out;
  }

  async function _loadFromFolder(files) {
    // Busca el primer JSON de proyecto Mosaiker dentro de la carpeta.
    // Si hay varios, nos quedamos con el primero que valide.
    let data = null;
    for (const f of files) {
      if (!f.name.toLowerCase().endsWith('.json')) continue;
      try {
        const candidate = JSON.parse(await f.text());
        if (candidate && candidate.type === 'mosaiker') {
          data = candidate;
          break;
        }
      } catch (_) { /* no es JSON válido, seguimos */ }
    }
    if (!data) throw new Error('No se encontró ningún proyecto Mosaiker (.json) en la carpeta');

    _validate(data);

    // Localiza los archivos de imagen en la subcarpeta /imagenes/
    // (webkitRelativePath = "carpetaSeleccionada/imagenes/archivo.jpg")
    const imagesMap = data.images || {};
    const needed    = new Set(Object.values(imagesMap));
    const imageFiles = files.filter(f =>
      f.webkitRelativePath.includes('/imagenes/') && needed.has(f.name)
    );

    if (typeof Images !== 'undefined') Images.clear();
    _applyState(data);

    // Localiza un archivo de la carpeta por manifest (atajo) o por prefijo de clave.
    const findFolder = (manifestPath, prefix) =>
      (manifestPath && files.find(f => f.webkitRelativePath.includes('/imagenes/' + manifestPath)))
      || files.find(f => f.webkitRelativePath.includes('/imagenes/' + prefix))
      || null;

    // Imágenes vinculadas por contenedor (emparejadas por clave, no por nombre).
    for (const { cacheKey, manifestPath, prefix } of _boundEntries(data)) {
      const bf = findFolder(manifestPath, prefix);
      if (!bf) { console.warn('[Mosaiker] Imagen vinculada ausente:', prefix); continue; }
      try { await Images.bindFileToContainer(bf, cacheKey); } catch (_) { console.warn('[Mosaiker] No se pudo revincular', cacheKey); }
    }

    // Imágenes de grupos (contenedores virtuales).
    for (const { cacheKey, manifestPath, prefix } of _groupEntries(data)) {
      const bf = findFolder(manifestPath, prefix);
      if (!bf) { console.warn('[Mosaiker] Imagen de grupo ausente:', prefix); continue; }
      try { await Images.bindFileToContainer(bf, cacheKey); } catch (_) { console.warn('[Mosaiker] No se pudo revincular grupo', cacheKey); }
    }

    // Fondos por formato.
    for (const { fid, manifestPath, prefix } of _bgEntries(data)) {
      const bf = findFolder(manifestPath, prefix);
      if (bf && typeof Background !== 'undefined') Background.setImageFileFor(fid, bf);
    }
    if (typeof Background !== 'undefined') Background.update();

    // Capas-imagen (logos): se registran como File (no van a la caché WebGL).
    for (const { cacheKey, manifestPath, prefix } of _overlayEntries(data)) {
      const bf = findFolder(manifestPath, prefix);
      if (!bf) { console.warn('[Mosaiker] Imagen de capa ausente:', prefix); continue; }
      if (typeof Layers !== 'undefined' && Layers.setFile) Layers.setFile(cacheKey, bf);
    }

    // Sello (imagen global): por data.sello o, si falta, buscando en /imagenes/sello/.
    let selloFile = data.sello ? files.find(f => f.webkitRelativePath.includes('/imagenes/' + data.sello)) : null;
    if (!selloFile) selloFile = files.find(f => f.webkitRelativePath.includes('/imagenes/sello/'));
    if (selloFile) imageFiles.push(selloFile);

    if (imageFiles.length > 0 && typeof Images !== 'undefined') {
      await Images.loadFiles(imageFiles);
    } else if (typeof Mosaic3D !== 'undefined') {
      Mosaic3D.refreshTextures();
    }

    // Repinta el panel CAPAS y las capas-imagen del formato activo (sus binarios
    // ya están revinculados arriba).
    if (typeof Layers !== 'undefined' && Layers.update) Layers.update();

    console.log(`[Mosaiker] Proyecto cargado desde carpeta: ${data.projectName} (${imageFiles.length}/${needed.size} imágenes)`);
  }

  function _validate(data) {
    if (!data || typeof data !== 'object') throw new Error('Archivo inválido');
    if (data.type !== 'mosaiker') throw new Error('Este archivo no es un proyecto de Mosaiker');
    if (typeof data.version !== 'number') throw new Error('Versión no reconocida');
    return true;
  }

  // ── APLICAR ESTADO ────────────────────────────────────────

  function _applyState(data) {
    // 1. Campos por-formato y globales (no-composición).
    State.projectName       = data.projectName       || 'proyecto';
    State.activeFormatId    = data.activeFormatId    || null;
    State.customFormat      = data.customFormat || null;
    State.overlays          = { ...(data.overlays         || {}) };
    State.vignettes         = JSON.parse(JSON.stringify(data.vignettes || {}));
    State.mosaicOpacity     = { ...(data.mosaicOpacity    || {}) };
    State.mosaicBlur        = { ...(data.mosaicBlur       || {}) };
    State.stacksBorder      = { ...(data.stacksBorder     || {}) };
    State.stacksBorderWidth = { ...(data.stacksBorderWidth || {}) };
    State.stacksBorderColor = { ...(data.stacksBorderColor || {}) };
    State.shadowOpacity     = { ...(data.shadowOpacity    || {}) };
    State.shadowX           = { ...(data.shadowX          || {}) };
    State.shadowY           = { ...(data.shadowY          || {}) };
    State.shadowBlur        = { ...(data.shadowBlur       || {}) };
    State.backgrounds       = { ...(data.backgrounds      || {}) };
    State.backgroundImages  = { ...(data.backgroundImages || {}) };
    State.formatsOk         = { ...(data.formatsOk        || {}) };
    State.formatSnapshots   = { ...(data.formatSnapshots  || {}) };
    State.showImagePrefixes = !!data.showImagePrefixes;

    // 2. Composiciones por formato.
    if (data.compositions && Object.keys(data.compositions).length) {
      State.compositions      = JSON.parse(JSON.stringify(data.compositions));
      State.defaultSkeletonId = data.defaultSkeletonId || null;
    } else {
      // Migración de proyecto antiguo (transform/esqueleto globales) → una
      // composición para el formato activo.
      State.compositions = {};
      State.defaultSkeletonId = data.activeSkeletonId || null;
      const base = { rotX: 35, rotY: 0, camX: 0, camY: 0, camZ: 10, gap: 8, radius: 12, colOffsets: [] };
      const t = Object.assign(base, (data.transform && typeof data.transform === 'object') ? data.transform : {});
      if (!Array.isArray(t.colOffsets)) t.colOffsets = [];
      if (data.activeFormatId) {
        State.compositions[data.activeFormatId] = {
          skeletonId:      data.activeSkeletonId || null,
          transform:       JSON.parse(JSON.stringify(t)),
          imageAdjust:     JSON.parse(JSON.stringify(data.imageAdjust || {})),
          containerImages: { ...(data.containerImages || {}) },
          fitted:          true,
        };
      }
    }
    // Las composiciones cargadas ya tienen su encuadre → restaurar, no re-fit.
    Object.values(State.compositions).forEach(c => {
      c.fitted = true;
      if (!c.transform || typeof c.transform !== 'object') c.transform = { rotX: 35, rotY: 0, camX: 0, camY: 0, camZ: 10, gap: 8, radius: 12, colOffsets: [] };
      if (!Array.isArray(c.transform.colOffsets)) c.transform.colOffsets = [];
      if (!c.imageAdjust)     c.imageAdjust = {};
      if (!c.containerImages) c.containerImages = {};
    });

    // 3. Activa el formato → aplica su composición (mosaico + transform restaurado).
    //    Refresca antes el dropdown para que la opción CUSTOM muestre el tamaño
    //    restaurado y getById('custom') funcione.
    if (typeof Formats !== 'undefined') {
      if (Formats.refresh) Formats.refresh();
      if (State.activeFormatId) Formats.setActive(State.activeFormatId);
    }

    // 4. UI + toggle prefijos.
    if (typeof UI !== 'undefined') {
      if (UI.syncTransformSliders) UI.syncTransformSliders();
      if (UI.renderColOffsets)     UI.renderColOffsets();
      if (UI.updateOkButton)       UI.updateOkButton();
      if (UI.updateExportButton)   UI.updateExportButton();
    }
    const cb = document.getElementById('toggle-show-prefixes');
    if (cb) {
      cb.checked = !!State.showImagePrefixes;
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.setPrefixesVisible(!!State.showImagePrefixes);
    }
  }

  // ── MODAL DE GUARDADO ─────────────────────────────────────

  function _showSaveModal() {
    document.getElementById('project-save-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'project-save-modal';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    const modal  = document.createElement('div');
    modal.className = 'modal';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = 'Guardar proyecto';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'modal-label';
    nameLabel.textContent = 'Nombre del proyecto';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'modal-input';
    nameInput.value = State.projectName && State.projectName !== 'Sin título'
      ? State.projectName
      : '';
    nameInput.placeholder = 'mi_proyecto';

    const desc = document.createElement('p');
    desc.className = 'modal-desc';
    desc.textContent = 'Elige cómo quieres guardar:';

    const btnZip = _makeModalOption(
      'Guardar todo el proyecto',
      'ZIP con imágenes + configuración',
      () => {
        const name = _sanitizeName(nameInput.value) || 'proyecto';
        State.projectName = name;
        overlay.remove();
        _saveZip(name);
      }
    );

    const btnJson = _makeModalOption(
      'Guardar configuración',
      'Sólo el JSON, sin imágenes',
      () => {
        const name = _sanitizeName(nameInput.value) || 'proyecto';
        State.projectName = name;
        overlay.remove();
        _saveJson(name);
      }
    );

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-cancel';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', () => overlay.remove());

    body.appendChild(nameLabel);
    body.appendChild(nameInput);
    body.appendChild(desc);
    body.appendChild(btnZip);
    body.appendChild(btnJson);
    body.appendChild(btnCancel);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => nameInput.focus(), 50);
  }

  function _makeModalOption(title, subtitle, onClick) {
    const btn = document.createElement('div');
    btn.className = 'modal-option';

    const t = document.createElement('div');
    t.className = 'modal-option-title';
    t.textContent = title;

    const s = document.createElement('div');
    s.className = 'modal-option-subtitle';
    s.textContent = subtitle;

    btn.appendChild(t);
    btn.appendChild(s);
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ── SERIALIZACIÓN ─────────────────────────────────────────

  function _serializeState() {
    return {
      version:         VERSION,
      type:            'mosaiker',
      projectName:     State.projectName || 'proyecto',
      savedAt:         new Date().toISOString(),

      activeFormatId:  State.activeFormatId,
      customFormat:    State.customFormat ? { ...State.customFormat } : null,

      // Composición por formato (mosaico, transform, encuadre, sustituciones).
      compositions:    JSON.parse(JSON.stringify(State.compositions || {})),
      defaultSkeletonId: State.defaultSkeletonId || null,

      overlays:        { ...State.overlays },
      vignettes:       JSON.parse(JSON.stringify(State.vignettes)),
      mosaicOpacity:   { ...State.mosaicOpacity },
      mosaicBlur:      { ...State.mosaicBlur },
      stacksBorder:    { ...State.stacksBorder },
      stacksBorderWidth: { ...State.stacksBorderWidth },
      stacksBorderColor: { ...State.stacksBorderColor },
      shadowOpacity:   { ...State.shadowOpacity },
      shadowX:         { ...State.shadowX },
      shadowY:         { ...State.shadowY },
      shadowBlur:      { ...State.shadowBlur },
      backgrounds:     { ...State.backgrounds },
      backgroundImages:{ ...State.backgroundImages },
      formatsOk:       { ...State.formatsOk },
      formatSnapshots: { ...State.formatSnapshots },
      showImagePrefixes: !!State.showImagePrefixes,

      // Mapping prefijo → nombre original. En modo ZIP los binarios viven
      // en /imagenes/ del propio ZIP. En modo JSON no hay binarios; al abrir
      // el JSON, el usuario tendrá que volver a arrastrar las imágenes.
      images: _serializeImageRefs(),
    };
  }

  function _serializeImageRefs() {
    const out = {};
    if (typeof Images === 'undefined') return out;
    Images.getLoadedNumbers().forEach(n => {
      const file = Images.getOriginalFile(n);
      if (file) out[n] = file.name;
    });
    return out;
  }

  // ── GUARDAR ZIP ───────────────────────────────────────────

  async function _saveZip(name) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado. Comprueba que assets/js/jszip.min.js está incluido.');
      return;
    }

    const toast = _showSaveToast();
    await new Promise(r => setTimeout(r, 0));   // deja pintar el toast antes del trabajo pesado

    const zip       = new JSZip();
    const data      = _serializeState();
    const imgFolder = zip.folder('imagenes');

    // Volcado de archivos binarios originales (por índice)
    if (typeof Images !== 'undefined') {
      Images.getLoadedNumbers().forEach(n => {
        const file = Images.getOriginalFile(n);
        if (file) imgFolder.file(file.name, file);
      });

      // Imágenes vinculadas a contenedores (de TODAS las composiciones) →
      // subcarpeta /imagenes/bound. Clave de caché = formatId::slotKey.
      const boundManifest = {};
      Object.entries(State.compositions || {}).forEach(([fid, c]) => {
        Object.keys(c.containerImages || {}).forEach(slotKey => {
          const cacheKey = fid + '::' + slotKey;
          const file = Images.getOriginalFile(cacheKey);
          if (!file) return;
          const stored = 'bound/' + cacheKey.replace(/[^a-z0-9]+/gi, '_') + '__' + file.name;
          imgFolder.file(stored, file);
          boundManifest[cacheKey] = stored;
        });
      });
      data.boundImages = boundManifest;

      // Imágenes de los grupos (contenedores virtuales) → /imagenes/group
      const groupManifest = {};
      Object.entries(State.compositions || {}).forEach(([fid, c]) => {
        (c.groups || []).forEach(g => {
          if (!g.cacheKey) return;
          const file = Images.getOriginalFile(g.cacheKey);
          if (!file) return;
          const stored = 'group/' + g.cacheKey.replace(/[^a-z0-9]+/gi, '_') + '__' + file.name;
          imgFolder.file(stored, file);
          groupManifest[g.cacheKey] = stored;
        });
      });
      data.groupImages = groupManifest;

      // Imágenes de las capas-imagen (logos) → subcarpeta /imagenes/overlay
      const overlayManifest = {};
      Object.entries(State.compositions || {}).forEach(([fid, c]) => {
        (c.overlays || []).forEach(o => {
          if (!o.cacheKey) return;
          const file = (typeof Layers !== 'undefined' && Layers.getFile && Layers.getFile(o.cacheKey))
            || Images.getOriginalFile(o.cacheKey);
          if (!file) return;
          const stored = 'overlay/' + o.cacheKey.replace(/[^a-z0-9]+/gi, '_') + '__' + file.name;
          imgFolder.file(stored, file);
          overlayManifest[o.cacheKey] = stored;
        });
      });
      data.overlayImages = overlayManifest;

      // Imágenes de fondo por formato → subcarpeta /imagenes/bg
      const bgManifest = {};
      if (typeof Background !== 'undefined' && Background.getImageFile) {
        Object.keys(State.backgroundImages || {}).forEach(fid => {
          const file = Background.getImageFile(fid);
          if (!file) return;
          const stored = 'bg/' + fid.replace(/[^a-z0-9]+/gi, '_') + '__' + file.name;
          imgFolder.file(stored, file);
          bgManifest[fid] = stored;
        });
      }
      data.bgImages = bgManifest;

      // Sello (imagen global de la banda central de los mosaicos 'stacks').
      if (Images.getSelloFile) {
        const sf = Images.getSelloFile();
        if (sf) {
          const stored = 'sello/' + sf.name;
          imgFolder.file(stored, sf);
          data.sello = stored;
        }
      }
    }

    zip.file(name + '.json', JSON.stringify(data, null, 2));

    const blob = await zip.generateAsync({
      type:        'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }, (meta) => { if (toast) toast.update(meta.percent); });
    if (toast) toast.close();
    _download(blob, name + '.mosaiker.zip');
  }

  // Toast de progreso mientras se empaqueta el ZIP (mismo estilo que el del
  // export). El guardado tarda varios segundos con muchas imágenes; sin esto no
  // hay feedback hasta que salta el diálogo de descarga.
  function _showSaveToast() {
    document.getElementById('save-progress')?.remove();
    const el = document.createElement('div');
    el.id = 'save-progress';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#161616;border:1px solid #2e2e2e;border-radius:4px;padding:12px 16px;min-width:260px;box-shadow:0 8px 24px rgba(0,0,0,0.6);font-family:var(--font);font-size:11px;color:#888;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--col-yellow);margin-bottom:6px;font-size:10px;';
    title.textContent = 'Guardando proyecto…';
    const info = document.createElement('div');
    info.id = 'save-progress-info';
    info.textContent = 'Empaquetando imágenes…';
    const bar = document.createElement('div');
    bar.style.cssText = 'height:2px;background:#222;border-radius:1px;margin-top:8px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.id = 'save-progress-fill';
    fill.style.cssText = 'height:100%;background:var(--col-yellow);width:0%;transition:width 0.2s;';
    bar.appendChild(fill);
    el.append(title, info, bar);
    document.body.appendChild(el);
    return {
      update: (pct) => {
        const f = document.getElementById('save-progress-fill');
        const i = document.getElementById('save-progress-info');
        if (f) f.style.width = Math.round(pct || 0) + '%';
        if (i && (pct || 0) >= 99) i.textContent = 'Generando archivo…';
      },
      close: () => setTimeout(() => document.getElementById('save-progress')?.remove(), 600),
    };
  }

  // ── GUARDAR JSON ──────────────────────────────────────────

  function _saveJson(name) {
    const data = _serializeState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    _download(blob, name + '.mosaiker.json');
  }

  // ── HELPERS ───────────────────────────────────────────────

  function _sanitizeName(name) {
    return (name || '').trim().replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
  }

  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { init, save: _showSaveModal, open };
})();
