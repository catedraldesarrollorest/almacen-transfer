-- EJECUTAR EN SUPABASE → SQL EDITOR
-- Copiar desde aquí directamente

-- PASO 1: Crear función para trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS
'BEGIN
  INSERT INTO public.users (id, email, rol, nombre)
  VALUES (NEW.id, NEW.email, ''operador'', split_part(NEW.email, ''@'', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END';

-- PASO 2: Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- PASO 3: Políticas para gestión de usuarios
DROP POLICY IF EXISTS "Users insert admin" ON users;
CREATE POLICY "Users insert admin" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update admin" ON users;
CREATE POLICY "Users update admin" ON users
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE rol = 'admin'));

-- PASO 4: Políticas para productos
DROP POLICY IF EXISTS "Productos insert" ON productos_base;
CREATE POLICY "Productos insert" ON productos_base
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Productos update" ON productos_base;
CREATE POLICY "Productos update" ON productos_base
  FOR UPDATE USING (true);

-- PASO 5: Establecer pekoshelly20@gmail.com como admin
INSERT INTO public.users (id, email, rol, nombre)
SELECT id, email, 'admin', 'Admin'
FROM auth.users
WHERE email = 'pekoshelly20@gmail.com'
ON CONFLICT (id) DO UPDATE SET rol = 'admin', nombre = 'Admin';
