-- ============================================
-- supabase-fix.sql
-- Ejecutar en Supabase → SQL Editor
-- Arregla: admin no reconocido + políticas RLS
-- ============================================

-- 1. Trigger para crear fila en users automáticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, rol, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    'operador',
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 2. Políticas RLS adicionales para que admin gestione usuarios
-- ============================================

-- Admin puede leer TODOS los usuarios
DROP POLICY IF EXISTS "Users read all for admin" ON users;
CREATE POLICY "Users read all for admin" ON users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
    OR auth.uid() = id
  );

-- Admin puede insertar nuevos usuarios
DROP POLICY IF EXISTS "Users insert admin" ON users;
CREATE POLICY "Users insert admin" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
    OR auth.uid() = id
  );

-- Admin puede actualizar usuarios
DROP POLICY IF EXISTS "Users update admin" ON users;
CREATE POLICY "Users update admin" ON users
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
  );

-- Admin puede insertar productos_base
DROP POLICY IF EXISTS "Productos insert admin" ON productos_base;
CREATE POLICY "Productos insert admin" ON productos_base
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
  );

-- Admin puede actualizar productos_base (upsert)
DROP POLICY IF EXISTS "Productos update admin" ON productos_base;
CREATE POLICY "Productos update admin" ON productos_base
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
  );


-- 3. IMPORTANTE: Establecer tu usuario como admin
-- ============================================
-- Reemplaza 'TU_EMAIL_AQUI' con tu email de administrador

INSERT INTO public.users (id, email, rol, nombre)
SELECT
  id,
  email,
  'admin',
  split_part(email, '@', 1)
FROM auth.users
WHERE email = 'TU_EMAIL_AQUI'
ON CONFLICT (id) DO UPDATE SET rol = 'admin';


-- ============================================
-- Listo! Ahora el admin es reconocido correctamente.
-- ============================================
