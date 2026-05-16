import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaTransferencia from './pages/NuevaTransferencia'
import AutorizarTransferencia from './pages/AutorizarTransferencia'
import Historial from './pages/Historial'
import Admin from './pages/Admin'
import SubirInventario from './pages/SubirInventario'
import Reportes from './pages/Reportes'
import GestionUsuarios from './pages/GestionUsuarios'
import GestionAlmacenes from './pages/GestionAlmacenes'
import LimpiarRegistros from './pages/LimpiarRegistros'
import InventarioAdmin from './pages/InventarioAdmin'
import NoLeidas from './pages/NoLeidas'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nueva" element={<NuevaTransferencia />} />
            <Route path="/autorizar" element={<AutorizarTransferencia />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/inventario" element={<SubirInventario />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/almacenes" element={<GestionAlmacenes />} />
            <Route path="/admin/limpiar" element={<LimpiarRegistros />} />
            <Route path="/admin/inventario" element={<InventarioAdmin />} />
            <Route path="/admin/no-leidas" element={<NoLeidas />} />
          </Route>
        </Routes>
      </OfflineProvider>
    </AuthProvider>
  )
}

export default App
