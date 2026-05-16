# Guía: Generar APK nativa de Android desde una PWA

## Requisitos previos

- Mac o Linux con terminal
- Node.js instalado (`node -v` para verificar)
- La PWA desplegada en producción (ej: Vercel)

---

## PASO 0 — Verificar el manifest de la PWA

En el `vite.config.js` asegúrate de que el manifest se llame `manifest.json`
y que el `index.html` lo referencie igual:

**vite.config.js:**
```js
VitePWA({
  registerType: 'autoUpdate',
  manifestFilename: 'manifest.json',   // <-- imprescindible
  manifest: {
    id: '/',
    start_url: '/',
    scope: '/',
    name: 'Nombre de tu app',
    short_name: 'App',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#XXXXXX',
    background_color: '#XXXXXX',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
})
```

**index.html** debe tener:
```html
<link rel="manifest" href="/manifest.json" />
```

Verifica que funcione en el navegador: `https://tu-app.vercel.app/manifest.json`
Debe devolver JSON, no un 404.

---

## PASO 1 — Instalar Java JDK 17

Descarga **Temurin JDK 17** desde `adoptium.net` (elige macOS, archivo `.pkg`)
e instálalo normalmente.

Verifica:
```bash
java -version
# Debe mostrar: openjdk version "17..."
```

---

## PASO 2 — Instalar Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
```

---

## PASO 3 — Crear la carpeta del proyecto APK

```bash
mkdir ~/mi-app-apk
cd ~/mi-app-apk
```

---

## PASO 4 — Iniciar el proyecto con Bubblewrap

```bash
bubblewrap init --manifest https://tu-app.vercel.app/manifest.json
```

Responde las preguntas así:

| Pregunta | Respuesta |
|---|---|
| Download Android SDK? | **Y** |
| Application package name | `com.tunombre.tuapp` (ej: `com.catedral.almacen`) |
| Key store location | Presiona Enter (usa el default) |
| Key store password | Una contraseña que recuerdes (ej: `mipassword`) |
| Key name / alias | `android` |
| Key password | La misma contraseña |

> **Nota:** Es normal que al final aparezca el error `ERROR The session has been destroyed`.
> El proyecto SÍ se generó correctamente. Continúa al siguiente paso.

---

## PASO 5 — Crear el keystore manualmente

El error anterior impide que se cree el keystore. Créalo tú con este comando
(reemplaza los valores entre comillas con los tuyos):

```bash
keytool -genkey -v \
  -keystore ~/mi-app-apk/android.keystore \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass mipassword \
  -keypass mipassword \
  -dname "CN=Tu Nombre, OU=Tu Org, O=Tu Empresa, L=Ciudad, ST=Provincia, C=CU"
```

Verifica que se creó el archivo:
```bash
ls ~/mi-app-apk/android.keystore
```

---

## PASO 6 — Ajustar el twa-manifest.json

Edita el archivo:
```bash
nano ~/mi-app-apk/twa-manifest.json
```

Busca y corrige estos dos campos:

**1. startUrl** — cámbialo de la URL completa a solo `/`:
```json
"startUrl": "/",
```

**2. targetSdkVersion** — agrégalo después de `"minSdkVersion"` (necesario para Android 14+):
```json
"minSdkVersion": 24,
"targetSdkVersion": 35,
```

Guarda: **Ctrl+O** → Enter → **Ctrl+X**

---

## PASO 7 — Compilar el APK

```bash
cd ~/mi-app-apk
bubblewrap build
```

Cuando pida contraseñas del keystore, escribe la que usaste en el Paso 5.

Al terminar verás:
```
Generated Android APK at ./app-release-signed.apk
Generated Android App Bundle at ./app-release-bundle.aab
```

El archivo que necesitas es **`app-release-signed.apk`**.

---

## PASO 8 — Eliminar la barra del navegador (TWA verification)

Sin este paso la app se abre con una barra del navegador visible arriba.

### 8a — Obtener el fingerprint SHA-256 del keystore:

```bash
keytool -list -v \
  -keystore ~/mi-app-apk/android.keystore \
  -alias android \
  -storepass mipassword
```

Copia el valor **SHA256** (formato: `AA:BB:CC:...`).

### 8b — Crear el archivo assetlinks.json en el proyecto web:

```bash
mkdir -p public/.well-known
```

Crea `public/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.tunombre.tuapp",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:..."
    ]
  }
}]
```

Sube este archivo al repositorio y despliega. Verifica que funcione:
`https://tu-app.vercel.app/.well-known/assetlinks.json`

### 8c — Vuelve a compilar el APK:

```bash
bubblewrap update
bubblewrap build
```

---

## PASO 9 — Instalar el APK en Android

1. Transfiere el `.apk` al teléfono (USB recomendado, también LocalSend o Drive)
2. En el teléfono: **Ajustes → Aplicaciones** → busca la app con la que abriste el APK
   → **Instalar apps desconocidas** → activar
3. Abre el `.apk` desde el gestor de archivos → **Instalar**

> En Android 14+ el permiso de fuentes desconocidas es **por aplicación**,
> no global. Debes activarlo específicamente para la app que usas para abrir el APK.

---

## Solución de problemas comunes

| Error | Solución |
|---|---|
| `manifest.json` da 404 | Verifica `manifestFilename: 'manifest.json'` en vite.config.js |
| `The session has been destroyed` | Normal, continúa con el Paso 5 |
| `No such file: android.keystore` | Ejecuta el comando keytool del Paso 5 |
| `El paquete no es válido` en Samsung | Agrega `"targetSdkVersion": 35` en twa-manifest.json (Paso 6) |
| Barra del navegador visible | Completa el Paso 8 (assetlinks.json) |
| PWABuilder no carga la sección Android | El manifest URL no coincide con el del index.html |

---

## Resumen de comandos en orden

```bash
# 1. Instalar dependencias
npm install -g @bubblewrap/cli

# 2. Crear proyecto
mkdir ~/mi-app-apk && cd ~/mi-app-apk
bubblewrap init --manifest https://tu-app.vercel.app/manifest.json

# 3. Crear keystore
keytool -genkey -v -keystore ~/mi-app-apk/android.keystore -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass mipassword -keypass mipassword \
  -dname "CN=Nombre, OU=Org, O=Empresa, L=Ciudad, ST=Provincia, C=CU"

# 4. Editar twa-manifest.json: startUrl="/" y agregar targetSdkVersion:35

# 5. Compilar
bubblewrap build

# 6. (Opcional) Obtener fingerprint para assetlinks.json
keytool -list -v -keystore ~/mi-app-apk/android.keystore -alias android -storepass mipassword
```
