-- ============================================
-- Setup SQL para AlmacenTransfer App
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Crear tablas
-- ============================================

-- Tabla de almacenes
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('entrada_salida', 'solo_salida')),
  activo BOOLEAN DEFAULT true,
  pin VARCHAR(10),
  qr_secret VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios (extiende auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  rol VARCHAR(20) CHECK (rol IN ('admin', 'operador')),
  warehouse_id INTEGER REFERENCES warehouses(id),
  nombre VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de productos base
CREATE TABLE IF NOT EXISTS productos_base (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  unidad_medida VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de transferencias
CREATE TABLE IF NOT EXISTS transferencias (
  id SERIAL PRIMARY KEY,
  origen_id INTEGER REFERENCES warehouses(id),
  destino_id INTEGER REFERENCES warehouses(id),
  entrega_nombre VARCHAR(100),
  recibe_nombre VARCHAR(100),
  fecha_hora TIMESTAMP DEFAULT NOW(),
  estado VARCHAR(20) CHECK (estado IN ('pendiente', 'completado')),
  autorizado_por UUID REFERENCES users(id),
  fecha_autorizacion TIMESTAMP,
  codigo_qr VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de productos en transferencias
CREATE TABLE IF NOT EXISTS transferencia_productos (
  id SERIAL PRIMARY KEY,
  transferencia_id INTEGER REFERENCES transferencias(id) ON DELETE CASCADE,
  producto VARCHAR(200) NOT NULL,
  cantidad DECIMAL(10,2),
  unidad VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insertar almacenes iniciales
-- ============================================

INSERT INTO warehouses (nombre, tipo, activo, pin, qr_secret) VALUES
  ('Almacén Central', 'entrada_salida', true, '1234', 'secret_central'),
  ('Almacén Deliver', 'entrada_salida', true, '5678', 'secret_deliver1'),
  ('Copmar Frigorífico', 'entrada_salida', true, '9012', 'secret_copmar'),
  ('Almacén Ciudad Libertad', 'entrada_salida', true, '3456', 'secret_ciudad'),
  ('Carnicería', 'entrada_salida', true, '7890', 'secret_carniceria'),
  ('Bar', 'entrada_salida', true, '1111', 'secret_bar'),
  ('Soda', 'entrada_salida', true, '2222', 'secret_soda'),
  ('Deliver', 'entrada_salida', true, '3333', 'secret_deliver2'),
  ('Cuenta Casa', 'solo_salida', true, '4444', 'secret_cuenta'),
  ('Consignación', 'solo_salida', true, '5555', 'secret_consignacion');

-- 3. Configurar Políticas RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencia_productos ENABLE ROW LEVEL SECURITY;

-- Políticas para warehouses (todos pueden leer, solo admin puede modificar)
CREATE POLICY "Warehouses read all" ON warehouses
  FOR SELECT USING (true);

-- Políticas para users
CREATE POLICY "Users read own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users read all for admin" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Políticas para transferencias
CREATE POLICY "Transferencias read" ON transferencias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Transferencias insert" ON transferencias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Transferencias update" ON transferencias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- Políticas para transferencia_productos
CREATE POLICY "Transferencia productos read" ON transferencia_productos
  FOR SELECT USING (true);

CREATE POLICY "Transferencia productos insert" ON transferencia_productos
  FOR INSERT WITH CHECK (true);

-- Políticas para productos_base
CREATE POLICY "Productos read all" ON productos_base
  FOR SELECT USING (true);

-- 4. Crear función para generar código QR único
-- ============================================

CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo_qr := 'TR-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || floor(random() * 10000)::int;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar QR automáticamente
CREATE TRIGGER set_qr_code
  BEFORE INSERT ON transferencias
  FOR EACH ROW
  EXECUTE FUNCTION generate_qr_code();

-- 5. Crear vista para historial completo
-- ============================================

CREATE OR REPLACE VIEW historial_transferencias AS
SELECT 
  t.id,
  t.codigo_qr,
  t.fecha_hora,
  t.estado,
  t.fecha_autorizacion,
  origen.nombre as almacen_origen,
  destino.nombre as almacen_destino,
  t.entrega_nombre,
  t.recibe_nombre,
  u.nombre as autorizado_por_nombre
FROM transferencias t
JOIN warehouses origen ON t.origen_id = origen.id
JOIN warehouses destino ON t.destino_id = destino.id
LEFT JOIN users u ON t.autorizado_por = u.id;

-- 6. Insertar productos de ejemplo (opcional)
-- ============================================

INSERT INTO productos_base (nombre, unidad_medida) VALUES
  ('Frijoles', 'lb'),
  ('Calabaza', 'lb'),
  ('Cebolla', 'lb'),
  ('Ají', 'lb'),
  ('Café', 'lb'),
  ('Arroz', 'lb'),
  ('Pollo', 'lb'),
  ('Cerdo', 'lb'),
  ('Res', 'lb'),
  ('Aceite', 'litro'),
  ('Sal', 'lb'),
  ('Azúcar', 'lb');

-- ============================================
-- Setup completado!
-- ============================================
