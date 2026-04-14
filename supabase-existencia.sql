-- Ejecutar en Supabase → SQL Editor
-- Agrega campo de existencia al inventario del almacén central

ALTER TABLE transferencia_productos
  ADD COLUMN IF NOT EXISTS existencia NUMERIC DEFAULT NULL;
