// ============================================================
// APP.JS — Punto de entrada. Inicializa los módulos.
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  Canvas.init();
  Formats.init();
  Overlays.init();
  Vignettes.init();
  MosaicOpacity.init();
  CellOpacity.init();
  MosaicBlur.init();
  StacksBorder.init();
  Shadow.init();
  Glow.init();
  Background.init();
  Layers.init();
  Project.init();
  Export.init();
  UI.init();

  // Mosaic3D carga Three.js de forma asíncrona, lo inicializamos después.
  // Skeletons enlaza el botón/modal y, al setActive(), notifica a Mosaic3D.
  await Mosaic3D.init();
  Skeletons.init();
  ImageAdjust.init();
  Toolbar.init();   // toolbar de botones + popovers de la bottom-bar
  EditableValues.init();   // cifras de sliders editables a mano

  // ESC deselecciona cualquier celda seleccionada (sin tener que buscar un hueco
  // vacío del viewport). Se ignora si estás escribiendo en un campo/cifra.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const ae = document.activeElement;
    if (ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT')) return;
    if (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection && Mosaic3D.clearSelection
        && Mosaic3D.getSelection().length) {
      Mosaic3D.clearSelection();
    }
  });

  // Sólo aplica un esqueleto si hay uno activo (p.ej. tras cargar proyecto).
  // De arranque activeSkeletonId es null → el botón queda en "Selecciona un mosaico".
  if (State.activeSkeletonId) Skeletons.setActive(State.activeSkeletonId);

  console.log('Mosaiker M+ — chasis y mosaico 3D listos.');
});
