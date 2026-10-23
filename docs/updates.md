# Auto-updater

ZeroTweaks comprueba al arrancar si hay una versión nueva publicada. El proceso
es totalmente silencioso: si no hay red, si el servidor falla o el manifiesto no
es válido, la app arranca igual.

## 1. Publicar el manifiesto

Hay que publicar un `version.json` accesible por HTTPS:

```json
{
  "version": "1.0.1",
  "url": "https://example.com/releases/ZeroTweaks-1.0.1.exe",
  "sha256": "9f2c... (hash sha256 del fichero)",
  "notes": "Corregidos los tirones al cambiar de GPU",
  "publishedAt": "2026-02-01",
  "mandatory": false
}
```

| Campo | Obligatorio | Descripción |
|---|---|---|
| `version` | sí | Versión publicada. Se compara numéricamente (`1.0.10` > `1.0.9`). |
| `url` | sí | Descarga directa del instalador (`.exe`) o del paquete portátil (`.zip`). |
| `sha256` | no | Hash SHA-256 del fichero. Si se indica, la descarga se **verifica** y se descarta si no coincide. |
| `notes` | no | Texto que se muestra en la barra de actualización. |
| `publishedAt` | no | Fecha de publicación (informativa). |
| `mandatory` | no | Si es `true`, la barra no se puede cerrar. |

La URL del manifiesto se puede cambiar en **Ajustes → Avanzado** o con la
variable de entorno `ZT_UPDATE_URL`.

## 2. Qué hace la app

1. **Comprobación en segundo plano**: al arrancar, la app consulta el manifiesto
   y compara la versión publicada con la que está en ejecución.
2. **Barra en la cabecera**: si hay versión nueva aparece una barra con
   *«Nueva versión disponible [vX.X.X] — Actualizar»*.
3. **Un clic**: la app descarga el fichero a `%TEMP%\ZeroTweaks\updates`, verifica
   el SHA-256, lanza un script de actualización y se cierra limpiamente.
4. **El script de actualización** espera a que el proceso termine (Windows bloquea
   el ejecutable en ejecución), sustituye los ficheros de la instalación y vuelve
   a arrancar la app.

## 3. Tus datos no se tocan

Los datos del usuario viven **fuera** de la carpeta de instalación:

```
%APPDATA%\ZeroTweaks\
├── settings.json        Ajustes de la app
├── Backups\            Copias de Zero Danger (manifiestos, journal, configs de juegos)
├── benchmarks\         Resultados de los benchmarks
└── logs\               Registro
```

El script de actualización solo sustituye la carpeta de instalación. Además,
comprueba que la carpeta de datos no esté dentro de la instalación: si lo
estuviera, la copia aparte antes de reemplazar y la restaura después.

## 4. Probarlo en local

```bash
node scripts/serve-update-manifest.js 8899
# en otra terminal
ZT_UPDATE_URL=http://127.0.0.1:8899/version.json npm run dev
```

O con la app ya compilada:

```bash
ZT_UPDATE_URL=http://127.0.0.1:8899/version.json npx electron .
```

Salen logs en la consola: `Update available: 1.0.0-alpha.1 -> 99.0.0`, `Update hash
verified` y `Update script launched`.
