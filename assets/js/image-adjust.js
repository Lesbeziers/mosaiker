// ============================================================
// IMAGE-ADJUST.JS — Encuadre por contenedor (sin modal)
//
// En modo editor, sobre la carátula bajo el cursor:
//   · Pulsar y arrastrar → mueve la imagen dentro del hueco.
//   · Rueda del ratón / pinch → escala la imagen (100%–300%, desde el centro).
// Arrastrar un archivo de imagen y soltarlo sobre un hueco vincula esa imagen
// a ese contenedor (ignorando su índice). Sobre vacío → carga por índice.
// El ajuste lo guarda Mosaic3D en State.imageAdjust / State.containerImages.
// ============================================================

const ImageAdjust = (() => {

  let drag = null;   // { key, lastX, lastY, moved }

  function init() {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    lienzo.addEventListener('mousedown', _onDown);
    lienzo.addEventListener('wheel', _onWheel, { passive: false });
    lienzo.addEventListener('dragover', _onDragOver);
    lienzo.addEventListener('drop', _onDrop);
    lienzo.addEventListener('dragleave', e => { if (!lienzo.contains(e.relatedTarget)) _clearDropHint(); });
    // Botón derecho arrastrando = zoom (Wacom: botón del lápiz). Evita el menú.
    lienzo.addEventListener('contextmenu', e => { if (State.view === 'editor') e.preventDefault(); });
  }

  // ── MOVER (arrastre) ──────────────────────────────────────

  function _onDown(e) {
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);
    // Shift + clic izquierdo → añade/quita celda de la selección (no arrastra).
    if (e.shiftKey && e.button === 0) {
      if (hit && Mosaic3D.toggleSelection) Mosaic3D.toggleSelection(hit.key);
      e.preventDefault();
      return;
    }
    // Clic normal izq:
    //  · sobre celda de un GRUPO → no inicia selección nueva (se va a mover el
    //    grupo); limpia cualquier selección en curso.
    //  · sobre celda suelta → la selección pasa a ser SOLO esa celda (semilla).
    //  · sobre hueco vacío → deselecciona todo.
    if (e.button === 0) {
      const inGroup = hit && Mosaic3D.getGroupIdOf && Mosaic3D.getGroupIdOf(hit.key);
      if (inGroup) { if (Mosaic3D.clearSelection) Mosaic3D.clearSelection(); }
      else if (Mosaic3D.setSelection) Mosaic3D.setSelection(hit ? [hit.key] : []);
    }
    if (!hit) { if (e.button === 0) Mosaic3D.setHighlight(null); return; }
    Mosaic3D.setHighlight(hit.key);          // foco amarillo en la carátula
    // Escalar arrastrando si: botón derecho, o CMD (Mac) / CTRL (Windows).
    // En el resto, botón izquierdo = mover.
    const mode = (e.button === 2 || e.metaKey || e.ctrlKey) ? 'zoom' : 'pan';
    drag = { key: hit.key, mode, lastX: e.clientX, lastY: e.clientY, moved: false };
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('mouseup', _onUp);
    e.preventDefault();
  }

  function _onMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return; // umbral
    drag.moved = true;
    drag.lastX = e.clientX; drag.lastY = e.clientY;
    if (drag.mode === 'zoom') {
      // Arrastrar hacia arriba (dy<0) amplía; hacia abajo reduce.
      Mosaic3D.scaleByFactor(drag.key, Math.pow(1.0025, -dy));
    } else {
      Mosaic3D.panByScreen(drag.key, dx, dy);
    }
  }

  function _onUp() {
    drag = null;
    window.removeEventListener('mousemove', _onMove);
    window.removeEventListener('mouseup', _onUp);
  }

  // ── ESCALAR (rueda / pinch) ───────────────────────────────

  function _onWheel(e) {
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);
    if (!hit) return;                       // sobre hueco vacío → deja el scroll
    e.preventDefault();                     // evita el scroll de la página
    // deltaY < 0 (rueda hacia arriba / pinch abrir) → ampliar.
    const factor = Math.pow(1.0015, -e.deltaY);
    Mosaic3D.scaleByFactor(hit.key, factor);
  }

  // ── ARRASTRAR-SOLTAR IMAGEN SOBRE UN HUECO ────────────────

  let _hintTimer = 0;

  function _onDragOver(e) {
    if (!(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files'))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;
    // Resalta (con parpadeo) el contenedor sobre el que caería la imagen.
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);
    Mosaic3D.setDropHint(hit ? hit.key : null);
    // Watchdog: si deja de haber dragover (salió o soltó), quita la pista.
    if (_hintTimer) clearTimeout(_hintTimer);
    _hintTimer = setTimeout(() => { if (typeof Mosaic3D !== 'undefined') Mosaic3D.clearDropHint(); }, 250);
  }

  function _clearDropHint() {
    if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = 0; }
    if (typeof Mosaic3D !== 'undefined' && Mosaic3D.clearDropHint) Mosaic3D.clearDropHint();
  }

  function _onDrop(e) {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    e.preventDefault();
    _clearDropHint();
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;

    const file = Array.from(files).find(f => /^image\//.test(f.type));
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);
    const selection = (Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];

    // Soltar sobre una celda SELECCIONADA (con 2+ celdas) → crea el "contenedor
    // virtual": la imagen se reparte sobre el bbox del grupo (cada celda su trozo).
    // Con 1 sola celda seleccionada cae al comportamiento clásico (1 celda).
    if (hit && file && selection.length >= 2 && selection.includes(hit.key) && Mosaic3D.createGroup) {
      Mosaic3D.createGroup(selection, file);
      Mosaic3D.clearSelection();
      Mosaic3D.setHighlight(null);
      return;
    }

    // Soltar una imagen suelta sobre una celda de un GRUPO → esa celda sale del
    // grupo y recibe la imagen (deshacer natural: rellenas una a una las celdas
    // que no quieres agrupadas). Sin comandos específicos.
    if (hit && file && Mosaic3D.getGroupIdOf && Mosaic3D.getGroupIdOf(hit.key) && Mosaic3D.removeKeyFromGroup) {
      Mosaic3D.removeKeyFromGroup(hit.key);
    }

    // Sobre un hueco → vincular esa imagen a ESE contenedor (ignora el índice
    // del archivo). Sobre vacío → carga por índice (comportamiento clásico).
    if (hit && file && typeof Images !== 'undefined' && Images.bindFileToContainer) {
      // Sustitución POR IMAGEN: se vincula al ÍNDICE de imagen (hit.n), así
      // reemplaza esa imagen en todas sus apariciones dentro del formato
      // (destacada + ecos). Clave de caché por (formato, índice) para no pisar
      // a otros formatos que usen el mismo mosaico.
      const cacheKey = State.activeFormatId + '::' + hit.n;
      State.containerImages[hit.n] = file.name;
      delete State.imageAdjust[hit.key];      // resetea el encuadre del hueco soltado
      const spin = _showSpinner(hit.key);     // feedback mientras decodifica (2-4s)
      Images.bindFileToContainer(file, cacheKey)
        .then(() => { if (typeof Mosaic3D !== 'undefined') Mosaic3D.refreshTextures(); })
        .catch(() => { delete State.containerImages[hit.n]; })
        .finally(() => { if (spin) spin.remove(); });
    } else if (typeof Images !== 'undefined') {
      Images.loadFiles(files);
    }
  }

  // Spinner de carga centrado sobre el contenedor mientras llega la imagen.
  function _showSpinner(key) {
    if (typeof Mosaic3D === 'undefined' || !Mosaic3D.getContainerScreen) return null;
    const scr = Mosaic3D.getContainerScreen(key);
    if (!scr) return null;
    const el = document.createElement('div');
    el.className = 'drop-spinner';
    el.style.left = scr.x + 'px';
    el.style.top  = scr.y + 'px';
    document.body.appendChild(el);
    return el;
  }

  return { init };
})();
