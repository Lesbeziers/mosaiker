// ============================================================
// APP.JS — Punto de entrada. Inicializa los módulos.
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  Canvas.init();
  Formats.init();
  Overlays.init();
  Vignettes.init();
  MosaicOpacity.init();
  Project.init();
  Export.init();
  UI.init();

  // Mosaic3D carga Three.js de forma asíncrona, lo inicializamos después.
  // Skeletons construye el dropdown y, al setActive(), notifica a Mosaic3D.
  await Mosaic3D.init();
  Skeletons.init();
  Skeletons.setActive(State.activeSkeletonId);

  console.log('Mosaiker M+ — chasis y mosaico 3D listos.');
});
