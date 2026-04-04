# AlmacenTransfer

App de gestión de transferencias entre almacenes para restaurante Catedral.

## 🚀 Deploy

1. Ejecutar el SQL en Supabase (`supabase-setup.sql`)
2. Configurar variables de entorno en archivo `.env`:
   ```
   VITE_SUPABASE_URL=tu_url
   VITE_SUPABASE_ANON_KEY=tu_key
   ```
3. Instalar dependencias: `npm install`
4. Build: `npm run build`
5. Deploy carpeta `dist/` a Netlify/Vercel

## 📱 Características

- ✅ PWA (funciona offline)
- ✅ Autenticación con roles (admin/operador)
- ✅ Transferencias con QR/PIN
- ✅ Historial completo
- ✅ Reportes automáticos diarios

## 🏗️ Stack

- React 18 + Vite
- TailwindCSS
- Supabase (PostgreSQL + Auth)
- PWA con offline support