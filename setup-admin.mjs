import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jqyproghtuirilltkfpj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeXByb2dodHVpcmlsbHRrZnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzExNDMsImV4cCI6MjA5MDkwNzE0M30.g6K_t2BVjFzcruKIEy5nmQPxR1NP1L8P1DvtYAnHbLY'
)

const EMAIL = 'pekoshelly20@gmail.com'
const PASSWORD = 'Hailey2026..'

async function main() {
  // Intentar login
  let userId
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })

  if (signInErr) {
    console.log('No existe aún, creando cuenta...')
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD })
    if (signUpErr) { console.error('Error al crear cuenta:', signUpErr.message); process.exit(1) }
    userId = signUpData.user?.id
    console.log('Cuenta creada:', userId)
  } else {
    userId = signInData.user?.id
    console.log('Login OK:', userId)
  }

  // Insertar/actualizar como admin
  const { error: upsertErr } = await supabase.from('users').upsert({
    id: userId,
    email: EMAIL,
    rol: 'admin',
    nombre: 'Admin'
  })

  if (upsertErr) {
    console.error('Error al asignar admin:', upsertErr.message)
    process.exit(1)
  }

  console.log('✓ Usuario configurado como admin correctamente')
  process.exit(0)
}

main()
