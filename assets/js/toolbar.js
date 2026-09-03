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
  // 'desenfoque' es GENERAL (por formato): se probó por celda y se descartó, así
  // que se queda aquí (solo-formato, se atenúa con selección).
  const FORMAT_ONLY = ['fondo', 'desenfoque'];
  // Botones cuyo ámbito SIGUE a la selección (título Mosaico ↔ Carátula/s).
  const CONTEXTUAL = ['opacidad', 'borde', 'shadow', 'glow'];
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
    // Centra el popover sobre el botón; corrige si se sale por cualquier lado.
    const bar = document.getElementById('bottombar');
    const center = btn.offsetLeft + btn.offsetWidth / 2;
    const place = () => {
      const pw = pop.offsetWidth;
      const barW = bar.clientWidth;
      let left = center - pw / 2;
      if (left + pw > barW - 8) left = barW - 8 - pw;
      if (left < 8) left = 8;
      pop.style.left = left + 'px';
    };
    place();                          // colocación inicial (ya es display:flex)
    requestAnimationFrame(place);     // reajusta cuando el layout está estable
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
