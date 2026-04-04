# SPEC.md - App de Transferencias de Almacén

## 1. Overview

**Nombre**: AlmacenTransfer
**Tipo**: PWA Web App (Progressive Web App)
**Funcionalidad**: Registro y autorización de transferencias entre almacenes de restaurante
**Usuario objetivo**: Admin + Operadores de almacén

---

## 2. UI/UX Specification

### Layout Structure
- **Mobile-first**: Diseñado para celulares (375px+)
- **Navigation**: Bottom nav para móviles, sidebar para desktop
- **Screens**:
  - Login
  - Dashboard (Admin vs Operador)
  - Crear Transferencia
  - Autorizar Transferencia
  - Historial
  - Admin: Gestión de almacenes
  - Admin: Subir inventario base
  - Admin: Reportes

### Visual Design

**Colors**:
- Primary: #1E3A5F (azul marino)
- Secondary: #2DD4BF (teal)
- Accent: #F59E0B (ámbar)
- Success: #10B981 (verde)
- Error: #EF4444 (rojo)
- Background: #F8FAFC (gris claro)
- Card: #FFFFFF

**Typography**:
- Font: Inter (system fallback)
- Headings: 20-28px bold
- Body: 14-16px regular
- Small: 12px

**Spacing**:
- Base: 4px
- Margins: 16px mobile, 24px desktop
- Card padding: 16px

### Components
- Buttons: Primary, Secondary, Outline, Danger
- Inputs: Text, Number, Select, Search
- Cards: Transfer card, Warehouse card
- Modals: Confirm, Scan QR, Input PIN
- Lists: Transfer history, Products

---

## 3. Functionality Specification

### Auth & Roles

**Roles**:
- `admin`: Acceso total, reportes, configuración
- `operador`: Solo su almacén, crear/autorizar transferencias

**Login**:
- Email + Password (Supabase Auth)
- PIN de almacén para operadores

### Warehouses (Almacenes)

| ID | Nombre | Tipo | Activo |
|----|--------|------|--------|
| 1 | Almacén Central | entrada/salida | ✅ |
| 2 | Almacén Deliver | entrada/salida | ✅ |
| 3 | Copmar Frigorífico | entrada/salida | ✅ |
| 4 | Almacén Ciudad Libertad | entrada/salida | ✅ |
| 5 | Carnicería | entrada/salida | ✅ |
| 6 | Bar | entrada/salida | ✅ |
| 7 | Soda | entrada/salida | ✅ |
| 8 | Deliver | entrada/salida | ✅ |
| 9 | Cuenta Casa | solo salida | ✅ |
| 10 | Consignación | solo salida | ✅ |

### Transferencias

**Estado**: `pendiente` → `autorizado` → `completado`

**Campos**:
- `origen_id`: FK warehouse
- `destino_id`: FK warehouse
- `productos`: Array [{nombre, cantidad, unidad}]
- `entrega_nombre`: string
- `recibe_nombre`: string
- `fecha_hora`: timestamp
- `estado`: enum
- `autorizado_por`: user_id
- `codigo_qr`: string (generado)

**Flujo**:
1. Operador crea transferencia
2. Sistema genera QR único
3. Operador destino escanea QR o ingresa PIN
4. Se valida autorización
5. Transferencia pasa a "completado"
6. Se registra en historial

### Productos

**Base de datos**: Excel subido por admin (nombre, unidad_medida)
**Búsqueda**: Autocomplete/sugerencia al escribir

### Reportes

**Automático**: 11:00 PM diario → Email a pekoshelly20@gmail.com
**Manual**: Botón en dashboard Admin

**Formatos**:
- PDF: Vista rápida para revisar
- Excel: Descargable para editar

---

## 4. Technical Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS
- **Offline**: Service Worker + IndexedDB
- **Backend**: Supabase (PostgreSQL)
- **QR**: qrcode + html5-qrcode
- **PDF**: jsPDF
- **Excel**: SheetJS (xlsx)
- **Email**: Supabase Edge Function + Resend (o similar)

---

## 5. Database Schema (Supabase)

### warehouses
```sql
id, nombre, tipo (entrada_salida|solo_salida), activo, pin, qr_secret, created_at
```

### users
```sql
id, email, rol (admin|operador), warehouse_id, nombre, created_at
```

### transferencias
```sql
id, origen_id, destino_id, entrega_nombre, recibe_nombre, fecha_hora, estado, autorizado_por, created_at
```

### transferencia_productos
```sql
id, transferencia_id, producto, cantidad, unidad
```

### productos_base
```sql
id, nombre, unidad_medida, created_at
```