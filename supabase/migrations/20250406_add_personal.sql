-- Tabla para personal de cada almacén
CREATE TABLE IF NOT EXISTS personal_almacen (
  id SERIAL PRIMARY KEY,
  almacen_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cargo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_personal_almacen_id ON personal_almacen(almacen_id);
