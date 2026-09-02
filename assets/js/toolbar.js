// ============================================================
// TOOLBAR.JS — Bottom-bar como toolbar de botones → popover contextual
//
// Cada botón abre un popover (anclado sobre la barra, sin tapar el lienzo) que
// aloja los controles que ya rellenan los módulos existentes (Background,
// MosaicOpacity/CellOpacity, MosaicBlur, StacksBorder, Overlays).
//
// Dim contextual: con celda(s) seleccionada(s) se atenúan los botones que hoy
// son SOLO de formato (fondo, desenfoque, borde). Opacidad queda activo (tiene
// versión por-celda) y Guías siempre activo (son de vista, no de la celda).
// ============================================================

const Toolbar = (() => {

  // Botones que solo aplican al formato → se atenúan si hay selección.
  //
  // NOTA: 'desenfoque' es conceptualmente contextual (debería poder ajustarse
  // también por celda), pero AÚN NO está implementado el desenfoque por-carátula.
  // Mientras tanto vive aquí (solo-formato). Cuando se implemente: sacar su
  // data-feat de FORMAT_ONLY y añadirlo a CONTEXTUAL → deja de atenuarse y su
  // título pasa a alternar Mosaico ↔ Carátula/s (sin más cambios en el Toolbar).
  const FORMAT_ONLY = ['fondo', 'desenfoque'];
  // Botones cuyo ámbito SIGUE a la selección (título Mosaico ↔ Carátula/s).
  const CONTEXTUAL = ['opacidad', 'borde'];
  let _open = null;

  function init() {
    const bar = document.getElementById('bottombar');
    if (!bar) return;

    bar.querySelectorAll('.bb-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.classList.contains('disabled')) return;
        const feat = btn.dataset.feat;
        if (_open === feat) { _closeAll(); return; }
        _openPopover(feat, btn);
      });
    });

    // Cerrar al hacer clic fuera del popover/botón, o con Esc.
    document.addEventListener('mousedown', e => {
      if (!_open) return;
      if (e.target.closest('.bb-pop') || e.target.closest('.bb-btn')) return;
      _closeAll();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeAll(); });

    update();
  }

  function _openPopover(feat, btn) {
    _closeAll();
    const pop = document.querySelector('.bb-pop[data-feat="' + feat + '"]');
    if (!pop) return;
    pop.classList.add('open');
    btn.classList.add('open');
    // Ancla el popover a la izquierda del botón; corrige si se sale por la derecha.
    const bar = document.getElementById('bottombar');
    pop.style.left = btn.offsetLeft + 'px';
    requestAnimationFrame(() => {
      const pr = pop.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      if (pr.right > br.right - 8) {
        pop.style.left = Math.max(8, btn.offsetLeft - (pr.right - (br.right - 8))) + 'px';
      }
    });
    _open = feat;
  }

  function _closeAll() {
    document.querySelectorAll('.bb-pop.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.bb-btn.open').forEach(b => b.classList.remove('open'));
    _open = null;
  }

  // Atenúa los botones "solo formato" cuando hay selección; cierra su popover
  // si estaba abierto. Se llama al cambiar la selección o el formato.
  function update() {
    const hasSel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection)
      ? Mosaic3D.getSelection().length > 0 : false;
    // Tinte del bottom en modo "editando selección".
    const bar = document.getElementById('bottombar');
    if (bar) bar.classList.toggle('sel-mode', hasSel);
    document.querySelectorAll('#bb-buttons .bb-btn').forEach(btn => {
      const disabled = hasSel && FORMAT_ONLY.includes(btn.dataset.feat);
      btn.classList.toggle('disabled', disabled);
      if (disabled && _open === btn.dataset.feat) _closeAll();
    });
    _updateTitles();
  }

  // Título de cada popover = etiqueta del botón + ámbito. Así reforzamos con la
  // PALABRA (no solo con el tinte del bottom) si editas el mosaico o la selección.
  // Común a todos los botones → los nuevos lo heredan sin tocar nada.
  function _updateTitles() {
    const sel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
    const n = sel.length;
    document.querySelectorAll('#bb-buttons .bb-btn').forEach(btn => {
      const feat = btn.dataset.feat;
      const pop = document.querySelector('.bb-pop[data-feat="' + feat + '"]');
      const title = pop ? pop.querySelector('.bb-pop-title') : null;
      if (!title) return;
      let scope = 'Mosaico';
      if (CONTEXTUAL.includes(feat) && n > 0) scope = (n > 1) ? `Carátulas (${n})` : 'Carátula';
      title.textContent = btn.textContent.trim() + ' ' + scope;
    });
  }

  return { init, update };
})();
