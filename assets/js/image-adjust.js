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
    // Botón derecho arrastrando = zoom (Wacom: botón del lápiz). Evita el menú.
    lienzo.addEventListener('contextmenu', e => { if (State.view === 'editor') e.preventDefault(); });
  }

  // ── MOVER (arrastre) ──────────────────────────────────────

  function _onDown(e) {
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);
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

  function _onDragOver(e) {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function _onDrop(e) {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    e.preventDefault();
    if (State.view !== 'editor' || typeof Mosaic3D === 'undefined') return;

    const file = Array.from(files).find(f => /^image\//.test(f.type));
    const hit = Mosaic3D.pickKeyAt(e.clientX, e.clientY);

    // Sobre un hueco → vincular esa imagen a ESE contenedor (ignora el índice
    // del archivo). Sobre vacío → carga por índice (comportamiento clásico).
    if (hit && file && typeof Images !== 'undefined' && Images.bindFileToContainer) {
      State.containerImages[hit.key] = file.name;
      delete State.imageAdjust[hit.key];      // imagen nueva → cover fresco
      Images.bindFileToContainer(file, hit.key)
        .then(() => { if (typeof Mosaic3D !== 'undefined') Mosaic3D.refreshTextures(); })
        .catch(() => { delete State.containerImages[hit.key]; });
    } else if (typeof Images !== 'undefined') {
      Images.loadFiles(files);
    }
  }

  return { init };
})();
