-- ============================================================
-- supabase-permissions.sql
-- Ejecutar en Supabase → SQL Editor
-- Permite acceso anónimo (la app verifica PIN localmente)
-- ============================================================

-- Transferencias
DROP POLICY IF EXISTS "Transferencias read" ON transferencias;
DROP POLICY IF EXISTS "Transferencias insert" ON transferencias;
DROP POLICY IF EXISTS "Transferencias update" ON transferencias;
CREATE POLICY "allow_all" ON transferencias FOR ALL USING (true) WITH CHECK (true);

-- Productos por transferencia
DROP POLICY IF EXISTS "Transferencia productos read" ON transferencia_productos;
DROP POLICY IF EXISTS "Transferencia productos insert" ON transferencia_productos;
CREATE POLICY "allow_all" ON transferencia_productos FOR ALL USING (true) WITH CHECK (true);

-- Productos base
DROP POLICY IF EXISTS "Productos read all" ON productos_base;
DROP POLICY IF EXISTS "Productos insert admin" ON productos_base;
DROP POLICY IF EXISTS "Productos insert" ON productos_base;
DROP POLICY IF EXISTS "Productos update admin" ON productos_base;
DROP POLICY IF EXISTS "Productos update" ON productos_base;
CREATE POLICY "allow_all" ON productos_base FOR ALL USING (true) WITH CHECK (true);

-- Almacenes
DROP POLICY IF EXISTS "Warehouses read all" ON warehouses;
CREATE POLICY "allow_all" ON warehouses FOR ALL USING (true) WITH CHECK (true);

-- Usuarios (tabla interna)
DROP POLICY IF EXISTS "Users read own" ON users;
DROP POLICY IF EXISTS "Users read all for admin" ON users;
DROP POLICY IF EXISTS "Users insert admin" ON users;
DROP POLICY IF EXISTS "Users update admin" ON users;
CREATE POLICY "allow_all" ON users FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Listo! La app ya puede operar con el PIN sin Supabase Auth.
-- ============================================================
