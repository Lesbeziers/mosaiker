# Migración de cuenta/máquina — Mosaiker M+

> Checklist y auditoría para mover el proyecto a otra cuenta de Claude / otra máquina.
> Escrito el 2026-11-16, justo antes de la migración. Complementa a `CLAUDE.md` (que
> explica el proyecto). Aquí solo está lo relativo a **no perder nada** en el traslado.

---

## ✅ Resultado de la auditoría (todo lo de git está a salvo)

Se revisó qué vivía **solo en local** antes de migrar. Conclusión: **todo el código
está en GitHub** (`https://github.com/Lesbeziers/mosaiker.git`). Detalle:

| Rama local | ¿En remoto? | ¿A salvo? |
|---|---|---|
| `main` | ✅ `origin/main` | Sí — rama estable de producción. |
| `destacados-x3` | ✅ `origin/destacados-x3` | Sí — 16 commits por delante de main (DESTACADOS x3 + MODO CAPA + docs). |
| `apariencia-inspector` | ❌ | Sí — **ya fusionada en `main`**, su historia está preservada. La ref local se puede perder sin consecuencias. |
| `claude/trusting-goldwasser-ae26d5` | ❌ | Sí — **ya fusionada en `main`**. Ref local prescindible. |
| `zigzag-offset` | ❌ | Sí — sus 3 commits (`55a263f`, `4b9e880`, `97c6e7d`) **están incluidos en `origin/destacados-x3`**. Verificado con `git merge-base --is-ancestor`. Ref local prescindible. |

- **Working tree limpio**, **sin stashes**, sin cambios sin commitear.
- Las ramas `apariencia-inspector`, `claude/trusting-*` y `zigzag-offset` son refs
  locales históricas: su contenido ya está en `main` o en `destacados-x3`. **No hace
  falta subirlas**; al clonar en la máquina nueva simplemente no existirán, y no pasa nada.

**Las dos ramas que importan — `main` y `destacados-x3` — están ambas en remoto.**

---

## ⚠️ Lo que NO está en git (se pierde si no se actúa)

1. **El repositorio vive en un volumen externo:** `/Volumes/MOVISTAR+/00 APPS/MOSAIKER/
   PROYECTO/`. En la máquina nueva, o bien se conecta ese mismo disco, o se **clona
   limpio** desde GitHub (recomendado para la cuenta nueva). Un `git clone` recupera
   `main` y `destacados-x3` completas.
2. **Memoria automática de Claude** (`~/.claude/projects/-Volumes-MOVISTAR--00-APPS-
   MOSAIKER-PROYECTO/memory/*.md`): está ligada a ESTA cuenta/máquina y **no migra**.
   *Ya no es crítica:* su contenido se ha destilado y verificado en `CLAUDE.md`. El nuevo
   Claude leerá `CLAUDE.md` del repo y tendrá todo el contexto.
3. **Config local `.claude/`** (gitignored): `launch.json` (preview headless, puerto 4138)
   y `settings.local.json`. Reproducibles — su contenido está más abajo en este doc.
4. **Credenciales de push** (HTTPS a GitHub, usuario `Lesbeziers`): en el keychain de la
   máquina vieja. En la nueva habrá que **re-autenticar** el primer `git push` (token/
   credencial de GitHub).
5. **Manual de uso** (`~/Desktop/Mosaiker_Manual/`, HTML→PDF): **NO está en el repo** y
   **no se encontró en el Desktop de esta máquina** al auditar (puede estar en la máquina
   vieja o ya haberse movido). Si existe y se quiere conservar, cópialo aparte antes de
   migrar; no viaja con el repo.

---

## 📋 Checklist de migración

### En la cuenta/máquina VIEJA (antes de cerrar)
- [x] `git push -u origin destacados-x3` — **hecho** (rama subida).
- [x] `CLAUDE.md` commiteado y subido a `destacados-x3` y `main` — **hecho**.
- [x] `MIGRACION.md` (este archivo) commiteado y subido — al terminar.
- [ ] Verificar que no quedan cambios sin subir: `git status` limpio y
      `git log origin/main..main` + `git log origin/destacados-x3..destacados-x3` vacíos.
- [ ] (Opcional) Copiar a sitio seguro el manual `~/Desktop/Mosaiker_Manual/` si se quiere.
- [ ] (Opcional) Si quieres conservar las refs `zigzag-offset`/`apariencia-inspector` por
      pura trazabilidad: `git push origin zigzag-offset apariencia-inspector`. **No es
      necesario** (su contenido ya está en main/destacados-x3).

### En la cuenta/máquina NUEVA (al empezar)
- [ ] `git clone https://github.com/Lesbeziers/mosaiker.git` (o conectar el disco externo).
- [ ] `git checkout destacados-x3` — es la rama con el trabajo más reciente.
- [ ] Re-autenticar GitHub al primer `git push` (credencial/token nuevo en el keychain).
- [ ] Leer `CLAUDE.md` para el contexto completo del proyecto.
- [ ] Recrear `.claude/launch.json` si vas a usar el preview headless (contenido abajo).
- [ ] Servir en local con Live Server o `python3 -m http.server` desde `PROYECTO/`
      (no `file://`). Requiere WebGL (Chrome).

---

## 📎 Contenido de la config local `.claude/` (para recrear)

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "mosaiker-preview",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "cd /tmp/mosaiker_preview && exec python3 -m http.server 4138"],
      "port": 4138
    }
  ]
}
```

`.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "mcp__Claude_Preview__preview_start"
    ]
  }
}
```

---

## 🔭 Pendientes tras la migración (recordatorio; ver `CLAUDE.md` §6)

- [x] **Fusionado `destacados-x3` → `main`** (merge `fdcd18b`, 2026-11-17). Todo el
      trabajo está en la rama estable.
- [x] **`?v=` de `index.html` bumpeado** a `20261117`.
- [ ] **Validar en producción con datos reales**: guardar/reabrir con **formatos
      heredados** y los **blend modes por celda** (paridad editor↔export). Están en `main`
      pero aún sin estrenar en trabajo real.
- [ ] Housekeeping opcional: borrar ramas históricas ya fusionadas
      (`destacados-x3`, `zigzag-offset`, `apariencia-inspector`, `claude/trusting-*`).
