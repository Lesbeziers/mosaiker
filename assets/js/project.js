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

  function open() {
    _showOpenModal();
  }

  function _showOpenModal() {
    document.getElementById('project-open-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'project-open-modal';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    const modal  = document.createElement('div');
    modal.className = 'modal';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = 'Abrir proyecto';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.className = 'modal-desc';
    desc.textContent = 'Elige cómo quieres abrir el proyecto:';

    const btnFolder = _makeModalOption(
      'Desde carpeta',
      'JSON + carpeta imagenes/ sueltos',
      () => { overlay.remove(); _openFromFolder(); }
    );

    const btnZip = _makeModalOption(
      'Desde archivo ZIP',
      'Archivo .mosaiker.zip empaquetado',
      () => { overlay.remove(); _openFromZip(); }
    );

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-cancel';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', () => overlay.remove());

    body.appendChild(desc);
    body.appendChild(btnFolder);
    body.appendChild(btnZip);
    body.appendChild(btnCancel);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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

  function _openFromZip() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.zip';
    input.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await _loadZip(file);
      } catch (err) {
        console.error('[Mosaiker] Error abriendo ZIP:', err);
        alert('No se pudo abrir el ZIP:\n' + (err.message || err));
      }
    });
    input.click();
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

    if (imageFiles.length > 0 && typeof Images !== 'undefined') {
      await Images.loadFiles(imageFiles);
    }

    console.log(`[Mosaiker] Proyecto cargado desde carpeta: ${data.projectName} (${imageFiles.length}/${needed.size} imágenes)`);
  }

  async function _loadZip(file) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip no está cargado');

    const zip = await JSZip.loadAsync(file);

    // Localiza el JSON dentro del ZIP (debe estar en la raíz)
    const jsonName = Object.keys(zip.files).find(n => n.endsWith('.json') && !n.includes('/'));
    if (!jsonName) throw new Error('El ZIP no contiene un archivo JSON de proyecto');

    const data = JSON.parse(await zip.file(jsonName).async('string'));
    _validate(data);

    // Reconstruye los archivos de imagen desde el ZIP
    const imagesMap = data.images || {};
    const files = [];
    for (const filename of Object.values(imagesMap)) {
      const entry = zip.file('imagenes/' + filename);
      if (!entry) {
        console.warn(`[Mosaiker] Imagen ausente en ZIP: ${filename}`);
        continue;
      }
      const blob = await entry.async('blob');
      files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
    }

    // Limpia cache anterior y aplica estado
    if (typeof Images !== 'undefined') Images.clear();
    _applyState(data);

    // Carga las imágenes (esto dispara un refresh final del mosaico)
    if (files.length > 0 && typeof Images !== 'undefined') {
      await Images.loadFiles(files);
    }

    console.log(`[Mosaiker] Proyecto cargado: ${data.projectName} (${files.length} imágenes)`);
  }

  function _validate(data) {
    if (!data || typeof data !== 'object') throw new Error('Archivo inválido');
    if (data.type !== 'mosaiker') throw new Error('Este archivo no es un proyecto de Mosaiker');
    if (typeof data.version !== 'number') throw new Error('Versión no reconocida');
    return true;
  }

  // ── APLICAR ESTADO ────────────────────────────────────────

  function _applyState(data) {
    // 1. Restaura todos los campos primitivos del estado
    State.projectName       = data.projectName       || 'proyecto';
    State.activeFormatId    = data.activeFormatId    || null;
    State.activeSkeletonId  = data.activeSkeletonId  || 'clasico';
    State.overlays          = { ...(data.overlays         || {}) };
    State.vignettes         = JSON.parse(JSON.stringify(data.vignettes || {}));
    State.mosaicOpacity     = { ...(data.mosaicOpacity    || {}) };
    State.mosaicBlur        = { ...(data.mosaicBlur       || {}) };
    State.backgrounds       = { ...(data.backgrounds      || {}) };
    State.formatsOk         = { ...(data.formatsOk        || {}) };
    State.formatSnapshots   = { ...(data.formatSnapshots  || {}) };
    State.showImagePrefixes = !!data.showImagePrefixes;
    State.transform         = JSON.parse(JSON.stringify(data.transform || {}));
    if (!Array.isArray(State.transform.colOffsets)) State.transform.colOffsets = [];

    // 2. Activa esqueleto en cascada (resetea colOffsets y dispara
    //    fitToLienzo en Mosaic3D — los re-aplicamos justo después).
    if (typeof Skeletons !== 'undefined' && State.activeSkeletonId) {
      Skeletons.setActive(State.activeSkeletonId);
    }

    // 3. Activa formato en cascada (dispara Canvas, Overlays, Vignettes,
    //    Mosaic3D.setFormat→fitToLienzo, OK button).
    if (typeof Formats !== 'undefined' && State.activeFormatId) {
      Formats.setActive(State.activeFormatId);
    }

    // 4. Re-aplica el transform guardado (sobreescribe los resets de los
    //    pasos anteriores: colOffsets y camZ habrán quedado a sus defaults).
    State.transform = JSON.parse(JSON.stringify(data.transform || {}));
    if (!Array.isArray(State.transform.colOffsets)) State.transform.colOffsets = [];
    if (typeof Mosaic3D !== 'undefined') {
      Mosaic3D.setTransform(State.transform);
      Mosaic3D.rebuild(); // necesario para que colOffsets surtan efecto
    }

    // 5. Sincroniza UI con el estado restaurado
    if (typeof UI !== 'undefined') {
      if (UI.syncTransformSliders) UI.syncTransformSliders();
      if (UI.renderColOffsets)     UI.renderColOffsets();
      if (UI.updateOkButton)       UI.updateOkButton();
      if (UI.updateExportButton)   UI.updateExportButton();
    }

    // 6. Toggle "Mostrar prefijos"
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
      activeSkeletonId:State.activeSkeletonId,

      transform:       JSON.parse(JSON.stringify(State.transform)),
      overlays:        { ...State.overlays },
      vignettes:       JSON.parse(JSON.stringify(State.vignettes)),
      mosaicOpacity:   { ...State.mosaicOpacity },
      mosaicBlur:      { ...State.mosaicBlur },
      backgrounds:     { ...State.backgrounds },
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

    const zip       = new JSZip();
    const data      = _serializeState();
    const imgFolder = zip.folder('imagenes');

    // Volcado de archivos binarios originales
    if (typeof Images !== 'undefined') {
      Images.getLoadedNumbers().forEach(n => {
        const file = Images.getOriginalFile(n);
        if (file) imgFolder.file(file.name, file);
      });
    }

    zip.file(name + '.json', JSON.stringify(data, null, 2));

    const blob = await zip.generateAsync({
      type:        'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    _download(blob, name + '.mosaiker.zip');
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
