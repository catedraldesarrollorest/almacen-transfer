const TZ = 'America/Havana'

export function formatFecha(date, opts = {}) {
  return new Date(date).toLocaleDateString('es', { timeZone: TZ, ...opts })
}

export function formatFechaHora(date, opts = {}) {
  return new Date(date).toLocaleString('es', { timeZone: TZ, ...opts })
}

export function fechaHoy() {
  return new Date().toLocaleDateString('es', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
}
