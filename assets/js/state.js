// ============================================================
// STATE.JS — Modelo de datos global de Mosaiker
// ============================================================
// Stub mínimo para el chasis. Se irá ampliando por hitos:
// formatos, esqueletos, imágenes cargadas, transformaciones, etc.

const State = {
  // Nombre del proyecto — se usa en el nombre del archivo al guardar
  projectName: 'Sin título',

  // Modo de visualización
  view: 'editor',          // 'editor' | 'all'

  // Formato activo (id de Formats.FORMATS)
  activeFormatId: null,

  // Esqueleto activo (id de Skeletons.SKELETONS)
  activeSkeletonId: 'clasico',

  // Parámetros del render 3D del mosaico (sliders TRANSFORMAR)
  transform: {
    rotX:   35,   // grados
    rotY:    0,   // grados
    camX:    0,
    camY:    0,
    camZ:   10,
    gap:     8,   // % de CELL_H
    radius: 12,   // 1/1000 de CELL_H
    // Offsets verticales por columna (sólo aplica a esqueletos type='columns').
    // Se inicializa al cambiar de esqueleto a partir de su defaultOffsets.
    colOffsets: [],
  },

  // Visibilidad de overlays — clave = overlay.id, valor = boolean.
  // Vacío al arrancar; cada switch arranca encendido y aquí sólo se guarda
  // explícitamente cuando el usuario lo apaga.
  overlays: {},

  // Viñetas por formato — clave = formatId, valor = { type, opacity }.
  // type = id de viñeta ('ventana', 'horizontal', 'vertical') o null = ninguna.
  // opacity = 0..1.
  vignettes: {},

  // Formatos marcados OK por el usuario (entrarán a VER TODAS y al export).
  // clave = formatId, valor = true. Se elimina la entrada al desmarcar.
  formatsOk: {},

  // Snapshots por formato (dataURL JPG). Se capturan al marcar OK y son
  // lo que se muestra como thumbnail en VER TODAS.
  formatSnapshots: {},

  // UI
  showImagePrefixes: false, // toggle "MOSTRAR PREFIJOS" del sidebar
};
