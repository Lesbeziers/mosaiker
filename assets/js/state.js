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

  // Formato personalizado (uno solo). null = no definido.
  // { width, height } en px. El formato sintetizado tiene id 'custom' y sin overlays.
  customFormat: null,

  // Esqueleto activo (id de Skeletons.SKELETONS).
  // null = ninguno aplicado aún → el botón muestra "Selecciona un mosaico".
  // OJO: a partir del modelo "composición por formato" esto es un PUNTERO al
  // skeletonId de la composición del formato activo (lo sincroniza Formats.setActive).
  activeSkeletonId: null,

  // ── COMPOSICIÓN POR FORMATO ────────────────────────────────
  // Cada formato guarda su propia composición independiente:
  //   compositions[formatId] = {
  //     skeletonId,                 // mosaico de ese formato
  //     transform: { rotX, rotY, camX, camY, camZ, gap, radius, colOffsets },
  //     imageAdjust: { contKey: {dx,dy,scale} },   // encuadre por contenedor
  //     containerImages: { contKey: filename },     // sustituciones por contenedor
  //     fitted: bool,               // si ya se auto-encuadró una vez
  //   }
  // El pool de imágenes por índice (Images) es GLOBAL. Vignette/opacidad/
  // desenfoque/fondo siguen en sus mapas por-formato.
  // transform / imageAdjust / containerImages activos son PUNTEROS a la
  // composición del formato activo (se intercambian en Formats.setActive).
  compositions: {},

  // Mosaico por defecto para formatos que aún no tienen uno propio. Lo fija el
  // primer mosaico elegido en el selector; luego cada formato puede cambiarlo.
  defaultSkeletonId: null,

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

  // Opacidad del mosaico por formato (0..1). Default = 1 (totalmente opaco).
  // Sólo afecta al mosaico 3D, no a la viñeta ni a los overlays ZSE/MOK.
  mosaicOpacity: {},

  // Desenfoque del mosaico por formato (0..1, fracción de la altura).
  // Default = 0 (nítido). Sólo afecta al mosaico 3D, no a viñeta ni overlays.
  mosaicBlur: {},

  // Color de fondo del lienzo por formato (hex). Default = '#0e0e0e'.
  // Se pinta detrás del mosaico en editor, VER TODAS y exportación.
  backgrounds: {},

  // Imagen de fondo por formato (nombre de archivo; el binario lo guarda
  // Background). Se dibuja (cover) detrás del mosaico, sobre el color.
  backgroundImages: {},

  // Ajuste de encuadre por CONTENEDOR (global, no por formato).
  // clave = `${skeletonId}:${índiceDeRender}`, valor = { dx, dy, scale }.
  // dx/dy = desplazamiento del centro de muestreo en UV; scale ≥ 1 (amplía).
  imageAdjust: {},

  // Imagen VINCULADA a un contenedor (arrastrar-soltar sobre el hueco).
  // clave = mismo `${skeletonId}:${índiceDeRender}`, valor = nombre de archivo.
  // El bitmap vive en Images bajo esa misma clave y tiene PRIORIDAD sobre el
  // índice `n` del esqueleto. Desacopla la imagen del sistema de índices.
  containerImages: {},

  // Formatos marcados OK por el usuario (entrarán a VER TODAS y al export).
  // clave = formatId, valor = true. Se elimina la entrada al desmarcar.
  formatsOk: {},

  // Snapshots por formato (dataURL JPG). Se capturan al marcar OK y son
  // lo que se muestra como thumbnail en VER TODAS.
  formatSnapshots: {},

  // UI
  showImagePrefixes: false, // toggle "MOSTRAR PREFIJOS" del sidebar
};
