# Mosaiker M+ — guía para retomar el proyecto

> Documento de traspaso. Lo lee un Claude (o persona) que **nunca ha visto las
> conversaciones anteriores**. Todo lo necesario para continuar el trabajo está aquí.
> Escrito el 2026-11-16. Idioma del proyecto y del equipo: **español**.

---

## ⚠️ LO PRIMERO

- **Trabaja sobre `main`. TODO está fusionado y subido ahí** (DESTACADOS x3 y MODO CAPA
  se integraron en `main` el 2026-11-17; ver §6). La rama `destacados-x3` ya está
  completamente contenida en `main` — es histórica, puedes ignorarla o borrarla.
- **Remoto:** `https://github.com/Lesbeziers/mosaiker.git` (usuario `Lesbeziers`,
  push HTTPS con credenciales en el keychain). La rama estable y actual es `origin/main`.
  Al clonar en una máquina nueva, `git clone` + trabajar en `main` ya trae todo.
- El repo vive en un **volumen externo** (`/Volumes/MOVISTAR+`), no en el disco local.
- Hay un `._*` y `.DS_Store` por todas partes porque el repo está en un disco externo
  no-HFS+; ya están en `.gitignore`, ignóralos.
- Para el traslado de cuenta/máquina hay un **`MIGRACION.md`** en la raíz con la
  auditoría completa y el checklist.

---

## 1. Qué es y para quién

**Mosaiker** es una herramienta web interna de **Movistar+** para generar
**mosaicos de carátulas** (pósters de películas/series) renderizados en 3D y
exportarlos a los múltiples formatos de las comunicaciones de la marca
(cabeceras, sliders, newsletters, landings…).

- **Usuarios:** el equipo de diseño de Movistar+. **Está EN PRODUCCIÓN**: lo usan
  para trabajo real. Implicación práctica: *no romper lo que funciona*; validar bien
  antes de subir; avisar de cualquier cambio de comportamiento.
- **Flujo de trabajo del diseñador:**
  1. Nombra sus carátulas con **prefijo numérico** (`01_xxx.jpg`, `15_yyy.jpg`). **El
     número del nombre ES la posición en el mosaico**, sin excepciones.
  2. Arrastra las imágenes al panel → se colocan automáticamente en los huecos.
  3. Elige **formato** y **mosaico** (esqueleto), ajusta encuadre/efectos.
  4. Marca cada formato con **OK** cuando está listo.
  5. **Exporta** (JPG/PNG) un ZIP con todos los formatos marcados OK.
  6. Textos y logos finales se montan **después en Photoshop** sobre el JPG
     exportado (aunque ya existe un panel CAPAS para logos; ver §4).
- **App hermana de referencia: Adaptator** (`/Volumes/MOVISTAR+/00 APPS/ADAPTACIONES/00
  PROYECTO/`). Misma familia visual (Validator/Adaptator/Mosaiker, paleta amarilla).
  Ante dudas de UX/arquitectura, **mira primero cómo lo resuelve Adaptator**.
- **"Nos vamos a llenar de mosaicos"** (dicho por el jefe de diseño) NO significa que
  quieran más tipos de mosaico — significa que las *comunicaciones* de Movistar+ se van
  a hacer con Mosaiker. Por eso la prioridad es **solidez y fiabilidad a volumen**
  (cero sorpresas en el export, consistencia editor↔export), no añadir mosaicos.

---

## 2. Estructura de carpetas y archivos

Carpeta raíz del proyecto en producción:
`/Volumes/MOVISTAR+/00 APPS/MOSAIKER/PROYECTO/`

Dentro de `MOSAIKER/` hay otras carpetas; **la única viva es `PROYECTO`**. `PROYECTO
BKP PRE REFACTOR` es una copia de seguridad de junio 2026; `PROTOTIPO`, `MATERIAL`,
`MULTI TESELA`, `DSNY`, `TEST MOSAICO - AFTER EFFECTS` son material/experimentos.

```
PROYECTO/
├── index.html                 # único HTML. Carga todos los CSS/JS al final del body.
├── CLAUDE.md                  # este archivo
├── assets/
│   ├── css/   base, layout, ui, panel, bottombar, layers
│   ├── fonts/ Apercu Movistar (WOFF) + Movistar Sans (OTF) + Movistar (OTF) — locales
│   ├── img/   cabecera_mosaiker.svg (logo), checks/ (overlays ZSE/mockup por formato),
│   │          vignette/ (PNGs de viñeta por resolución)
│   └── js/     ← toda la lógica (vanilla, sin build)
└── .claude/   launch.json (preview), settings.local.json — IGNORADO por git
```

### Archivos JS (todos IIFE globales, sin módulos ES, sin build)

| Archivo | Responsabilidad |
|---|---|
| `app.js` | **Orquestador.** `DOMContentLoaded` → `init()` de cada módulo en orden. |
| `state.js` | **`State` = modelo de datos global.** Lee este archivo entero primero; sus comentarios documentan todo el modelo. |
| `mosaic-3d.js` | **El corazón (1700 líneas).** Render Three.js del mosaico. Un `_buildX` por tipo de layout. Gestos, selección de celdas, grupos, picking. |
| `skeletons.js` | Catálogo de **esqueletos (mosaicos)**: huecos, ratios, opacidades. `ORDER` = orden visible. `_thumbSVG` = miniatura del selector. |
| `export.js` | **Exportación (1250 líneas).** REPLICA la lógica de `mosaic-3d.js` a resolución real sobre canvas 2D. Paridad editor↔export crítica. |
| `formats.js` | Catálogo de **formatos** (resoluciones fijas) + formato CUSTOM. "Composición por formato" (herencia al cambiar de formato). |
| `project.js` | **Guardar/abrir** proyecto (`.mosaiker` = ZIP con JSON + imágenes). También export a carpeta. |
| `images.js` | Pool de imágenes por índice + caché de bitmaps/texturas WebGL. `bindFileToContainer`, `copyBinding`. |
| `image-adjust.js` | Gestos de encuadre por contenedor (arrastrar=mover, rueda/pinch=escalar) y lógica de ratón (selección shift+clic). |
| `background.js` | Fondo por formato (color + imagen cover). |
| `layers.js` + `layers.css` | **Panel CAPAS:** logos/PNG importados ENCIMA del mosaico (capa 2D DOM, no en la escena 3D). |
| `ui.js` | Topbar, sidebar colapsable, VER TODAS, sliders genéricos, tooltips, re-encuadre. |
| `toolbar.js` | Botones de la **bottom-bar** y sus popovers (cada efecto vive en su módulo). |
| `vignettes.js` | Viñeta PNG por formato (selector + opacidad). |
| Efectos de la bottom-bar | `mosaic-opacity.js`, `cell-opacity.js`, `mosaic-blur.js`, `stacks-border.js` (borde blanco), `shadow.js` (sombra por celda), `glow.js` (halo neón por celda), `blend-mode.js` (**MODO CAPA**), `overlays.js` (guías ZSE/mockup). |
| `editable-values.js` | Cifras de sliders editables a mano (clic → escribir → Enter). |
| `canvas.js` | Util de canvas. |
| `jszip.min.js`, `three/` | Dependencias vendorizadas (ver §3). |

**Formatos** (en `formats.js`, resolución fija, NO editable por el usuario): Cabecera
detalle desktop/móvil (3840×2160 / 2160×3840), Landing central, Cabecera newsletters
(600×400), Cabecera slider desktop/móvil, Cabecera slider mediano desktop/móvil, Slider
mediano desktop/móvil, + **CUSTOM** (máx 8000², default 1920×1080). Cada uno lleva sus
overlays PNG (zona de seguridad / mockup) en `assets/img/checks/`.

**Mosaicos / esqueletos** (`ORDER` en `skeletons.js`; el `id` interno NO coincide con el
nombre visible y **no se debe cambiar** — compat con proyectos guardados):

| # | Nombre visible | `id` interno | `type` |
|---|---|---|---|
| 1 | HORIZONTALES | `filas` | `rows` |
| 2 | VERTICALES | `verticales` | `vcolumns` |
| 3 | CLÁSICO | `clasico` | `grid` |
| 4 | COLUMNAS MIXTAS | `columnas` | `columns` |
| 5 | COLUMNAS MIXTAS DESTACADOS | `frontal` | `columns` |
| 6 | ZIG-ZAG | `horizontal` | `stacks` |
| 7 | ZIG-ZAG + SELLO | `horizontal-sello` | `stacks` |
| 8 | FOTOGRAMAS | `fantasia` | `free` (dominós 2×1/1×2/1×1) |

Los 6 **tipos de layout** (`grid`, `columns`, `stacks`, `rows`, `vcolumns`, `free`)
están implementados en `mosaic-3d.js` (`_buildX`) **y replicados en `export.js`** y en
`skeletons.js` (`_thumbSVG`). Añadir/variar un mosaico = tocar esos 3 sitios.

---

## 3. Cómo se ejecuta

**No hay build, ni npm, ni package.json.** Es HTML+CSS+JS servido como estático.

- **Dependencias:** solo dos, vendorizadas en el repo: **Three.js** (`assets/js/three/`)
  y **JSZip** (`assets/js/jszip.min.js`). No se instala nada.
- **Requisito de navegador:** WebGL (el mosaico se renderiza en Three.js). Chrome es el
  navegador de referencia del equipo.
- **Ejecutar en local:** cualquier servidor estático desde `PROYECTO/`. El usuario usa
  **Live Server** de VS Code. Alternativa: `python3 -m http.server` en la carpeta.
  No abras `index.html` con `file://` (CORS/fetch fallan).
- **Preview headless** (sandbox de Claude): sirve una **COPIA en `/tmp/mosaiker_preview`**
  porque el volumen externo `/Volumes/MOVISTAR+` NO es accesible al helper de preview.
  `.claude/launch.json` lo arranca en el puerto **4138** (`python3 -m http.server`). Hay
  que **sincronizar** los cambios ahí (rsync `assets/` + copiar `index.html`) y forzar
  recarga sin caché. OJO: `requestAnimationFrame` NO se dispara en el preview headless →
  las animaciones (parpadeos, pulsos) no se ven en captura pero sí en navegador real.

**Cache-busting:** `index.html` cuelga `?v=YYYYMMDD` de cada CSS/JS. **Súbelo
(buscar/reemplazar `?v=`) en cada release que toque assets**, o el equipo se queda con
JS viejo cacheado (síntomas fantasma: "no exporta / no guarda"). Actualmente en
`?v=20261117` (bumpeado al integrar DESTACADOS x3 + MODO CAPA en `main`). La 1ª carga
tras un bump aún puede necesitar hard-refresh (el `index.html` cacheado es el viejo).

---

## 4. Decisiones de diseño y convenciones (y por qué)

### Convenciones de código (heredadas de Adaptator)
- **Vanilla HTML/CSS/JS, sin frameworks, sin TypeScript, sin build.** Es deliberado:
  el equipo mantiene todo el ecosistema así.
- Cada módulo es un **IIFE**: `const Foo = (() => { ... return { init, ... }; })();`
  expuesto como global. Scripts al final del `<body>`.
- Binding declarativo con atributos `data-*`.
- Paleta (variables CSS): `--col-bg #0e0e0e`, `--col-surface #161616`,
  `--col-border #2e2e2e`, `--col-text #ccc`, `--col-yellow #f0a500` (acento/activos),
  `--col-green #3dba6f` (estado OK). *Nota: los mockups v1 usaban cyan; se descartó por
  coherencia de familia — todo amarillo.*
- Tipografía **Apercu Movistar** + Movistar Sans, locales en `assets/fonts/`.

### Decisiones de PRODUCTO (rigidez intencional — no "arreglar" sin preguntar)
- **Asignación por prefijo del nombre de archivo, regla única.** `15_loquesea.jpg` → hueco
  15, siempre. El nombre ES la posición. Drop parcial sobreescribe solo ese hueco.
  *Por qué:* automatizar al máximo y tener una única fuente de verdad.
- **Sin shuffle, sin drag manual de imágenes entre huecos, sin crop por hueco.** Si
  aparece la tentación de añadir interacción manual sobre los huecos, **no lo hagas sin
  preguntar** — va contra la filosofía declarada.
- **Esqueletos definidos en código**, número fijo de huecos. Cualquier esqueleto se puede
  cargar en cualquier formato (zoom/posición resuelven el desencaje).
- **Resolución fija por formato** (no hay selector de resolución, salvo CUSTOM).
- **Export solo de formatos marcados OK.** El botón EXPORTAR queda deshabilitado si no
  hay ninguno. Guardar/abrir siempre permitido aunque falten imágenes.

### Decisiones de ARQUITECTURA (claves para no romper nada)
- **Cover en todo:** las imágenes se ajustan tipo `object-fit: cover` (rellenan, recortan
  sobrante, sin deformar), idéntico en editor y export (`_coverUV` / `_coverUVAdjusted`).
- **Ratios de carátula:** verticales **2:3 (0.667)**, horizontales **16:9 (1.778)**. OJO:
  las carátulas de origen son 1200×1800 = **2:3, NO 9:16** (error inicial corregido).
  FOTOGRAMAS (`free`) es la excepción: dominós 2:1/1:2/1:1, no se le aplica el ratio puro.
- **Composición por formato:** `State.compositions[formatId]` guarda skeletonId +
  transform + imageAdjust + containerImages + grupos de ESE formato. `State.transform`,
  `State.groups`, etc. activos son **PUNTEROS** que `Formats.setActive` intercambia. Al
  entrar por 1ª vez a un formato viniendo de otro con trabajo, se **hereda una copia
  INDEPENDIENTE** de la composición (`Formats._inheritFrom`) para readaptarla sin tocar
  el original. **No reasignes esos arrays in-place rompiendo el puntero** (ej: `createGroup`
  muta el array, no lo reemplaza — si lo reemplazas, export/guardado dejan de verlo).
- **Encuadre por contenedor:** `State.imageAdjust[key]` = `{dx,dy,scale}`, clave estable
  `${skeletonId}:${índiceDeRender}`.
- **Sustituir imagen arrastrando sobre un hueco:** `State.containerImages[key]` = nombre;
  el bitmap vive en `Images` bajo la clave del contenedor y tiene PRIORIDAD sobre el
  índice `n`. Persiste en `/imagenes/bound/`.
- **Contenedor virtual (grupos):** varias celdas seleccionadas (shift+clic) se comportan
  como un lienzo único; cada celda enseña su sub-UV de la misma imagen. Post-proceso
  `_applyGroups()` tras `_build` (cero refactor de los `_buildX`). Réplica en export.
  Persiste en `/imagenes/group/`.
- **Panel CAPAS (logos):** las capas importadas viven de su **propio `File`**
  (`Layers.getFile/setFile`, mapa `_files`), **NO** de la caché WebGL (`bindFileToContainer`
  es solo para el mosaico). *Por qué:* enrutarlas por la caché WebGL causaba el bug
  "solo bounding / no exporta / no guarda". La capa es 2D (DOM `<img>` sobre el canvas,
  z-index 2), plana, sin perspectiva 3D. Se heredan al cambiar de formato.
- **MODO CAPA (blend modes, lo último):** `blend-mode.js`. Fase 1 = modo del mosaico
  entero contra el fondo (CSS `mix-blend-mode` en editor / `globalCompositeOperation` en
  export). Fase 2 = modo **por celda** vía **shader GLSL** propio (replica los blend modes
  de Photoshop, separables + HSL). `mosaicBlendMode[fmt]` = default del formato;
  `cellBlendMode[key]` = override por celda. "Normal"/"Pass Through" existen separados
  (misma composición en Fase 1; diferencia real pensada para grupos). Estado **"Mixto"**
  en el selector cuando las celdas no comparten modo, para poder resetear todas a Normal.
- **Guardado:** `.mosaiker` = ZIP con `proyecto.json` + carpetas `/imagenes/{bound,group,
  overlay,bg}/` y sus manifiestos. Apertura por ZIP o por carpeta. Toast con progreso
  (`generateAsync` onUpdate) porque tardaba 6-7 s sin feedback.

---

## 5. Problemas conocidos, trucos y lo que no funcionó

- **GOTCHA recurrente: caché del navegador.** Al cambiar un JS bajo el mismo `?v=`, el
  navegador sirve el viejo → síntomas fantasma ("no exporta / no guarda / cambio no
  aparece"). Fix: subir `?v=` en `index.html` y/o DevTools→Network→"Disable cache". La 1ª
  vez tras bumpear aún hace falta hard-refresh (el `index.html` cacheado es el viejo).
- **No enrutar los logos del panel CAPAS por la caché WebGL** (`bindFileToContainer`):
  causaba "solo bounding box, no exporta, no guarda". Viven de su propio `File`. (Resuelto,
  pero es la tentación natural si tocas CAPAS.)
- **Bug "se pierde todo al cambiar de formato"** (resuelto, `e64ae1a`): `fitToLienzo()` no
  llamaba a `render()` → quedaba el frame del formato anterior hasta el 1er clic. Ahora
  renderiza al final. Lección: tras un cambio de layout/formato, asegúrate de renderizar.
- **`createGroup` muta el array de grupos in-place.** Si lo reasignas, rompes el puntero
  que leen export y guardado. Igual para cualquier array que sea puntero a la composición.
- **El marco blanco de ZIG-ZAG es un ANILLO** (hueco en el centro, `_makeRoundedFrame`),
  no un rectángulo sólido — para que un PNG transparente sobre la celda deje ver el fondo.
  El grosor del borde en export usa la misma referencia que el editor (altura lienzo +
  camZ) para que se vea igual.
- **Orientación EXIF:** algunas imágenes salían volteadas en export; corregido en `97c6e7d`.
- **Ratio vertical:** no asumas 9:16. Es 2:3 (1200×1800). Error inicial que costó corregir.
- **Preview headless no ve animaciones** (`requestAnimationFrame` no corre) y **no accede
  al volumen externo** → copia en `/tmp/mosaiker_preview`.
- **El manual de uso** (HTML, portada+índice+11 secciones, con miniaturas reales) está en
  `~/Desktop/Mosaiker_Manual/`, **NO en el repo**. Se exporta a PDF con Chrome
  (Imprimir→Guardar como PDF, márgenes ninguno + gráficos de fondo); `chrome --headless
  --print-to-pdf` topa a ~8 páginas.

---

## 6. Estado actual y pendientes

### Dónde está el trabajo
- **Todo en `main` / `origin/main`** (rama estable y actual). El 2026-11-17 se fusionó
  `destacados-x3` → `main` (merge `fdcd18b`), integrando DESTACADOS x3 y MODO CAPA.
- `main` contiene: catálogo de 8 mosaicos, cover, encuadre por contenedor,
  grupos/contenedor virtual, fondo por formato, panel CAPAS, efectos por celda
  (sombra/glow/opacidad/desenfoque/borde), **DESTACADOS x3**, **MODO CAPA**, export
  JPG/PNG/ambos + CUSTOM, guardar/abrir.
- Ramas históricas ya contenidas en `main` (prescindibles): `destacados-x3`,
  `apariencia-inspector`, `zigzag-offset`, `claude/trusting-goldwasser-ae26d5`.

### Trabajo reciente integrado en main (fusión 2026-11-17)
1. **DESTACADOS x3** (commits `4e63338`..`1cf07ff`): rework del mosaico **COLUMNAS MIXTAS
   DESTACADOS** (`id: frontal`) calcando 1:1 las coordenadas de Illustrator del cliente,
   proporciones 9:16/16:9 exactas, gap uniforme ajustable, y se añadió el contenedor 16
   (espejo de 12-16 arriba). Incluye paridad en export y fix de glow doblado.
2. **MODO CAPA** (commits `1352502`..`e9b6c43`): blend modes del mosaico (Fase 1 entero,
   Fase 2 por celda vía shader, Normal vs Pass Through, estado Mixto). Ver §4.

### Pendientes / a validar
- **Validar en producción, con datos reales** (DESTACADOS x3 y MODO CAPA ya están en
  `main` pero aún no se han estrenado con trabajo real): guardar/reabrir un proyecto que
  use **formatos heredados** (lo más delicado del modelo de composición por formato) y
  los nuevos **blend modes por celda** (que el export horneado coincida con el editor).
- Confirmar con el usuario que **FOTOGRAMAS (IRREGULAR)** queda con sus dominós sin forzar
  ratio puro.
- Menor/opcional: afinar sensibilidad del zoom con botón derecho / modificador.
- Housekeeping opcional: borrar las ramas históricas ya fusionadas (local y remoto).

### Prioridad declarada
**Solidez y fiabilidad a volumen**, no añadir mosaicos (el catálogo de 8 se considera
suficiente). Cero sorpresas en el export; consistencia editor↔export; robustez con muchos
usuarios/proyectos. El equipo valora mucho lo que hay — no romperlo.

---

## Cómo trabaja el usuario (preferencia de flujo)
Paso a paso: **consolida cada avance antes de pasar al siguiente**. Prefiere cambios
pequeños y verificados a grandes refactors de golpe. Verifica con datos reales antes de
dar algo por bueno. Trabaja sobre un flujo vivo en producción → avisa de cualquier cambio
de comportamiento y no subas nada sin validar.
```
