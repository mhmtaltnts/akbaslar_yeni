import { Routes, Route } from 'react-router-dom'
import PublicLayout from './routes/publicRoute/PublicLayout'
import Public from './routes/publicRoute/Public'
import Login from './routes/publicRoute/Login';
import DashLayout from './routes/privateRoutes/DashLayout'
import Welcome from './routes/privateRoutes/Welcome'
import NotesList from './features/notes/NotesList'
import UsersList from './features/users/UsersList'
import EditUser from './features/users/EditUser'
import NewUser from './features/users/NewUser'
import EditNote from './features/notes/EditNote'
import NoteDetail from './features/rapor/NoteDetail';
import EditRapor from './features/rapor/EditRapor'
import Cikis from './features/cikis/Cikis'
import EditGumruk from './features/gumruk/EditGumruk'
import Rapor from './features/rapor/Rapor'
import NewNote from './features/notes/NewNote'
import Prefetch from './features/auth/Prefetch'
import PersistLogin from './features/auth/PersistLogin'
import RequireAuth from './features/auth/RequireAuth'
import { ROLES } from './config/roles'
import useTitle from './hooks/useTitle';
import PublicNotesList from './routes/publicRoute/PublicNotesList';
import { selectCurrentTheme } from "./app/appStore/themeSlice"
import { useSelector } from 'react-redux'

function App() {
  useTitle('Gebze Konak Tır Parkı')
  const dark = useSelector(selectCurrentTheme)

  return (
    <div className={ dark ? `dark` : `light`}>
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        {/* public routes */}
        <Route index element={<Public />} />
        <Route path="araclar" element={<PublicNotesList />} />
        <Route path="login" element={<Login />} />
      </Route>

        {/* Protected Routes */}
        <Route element={<PersistLogin />}>
          <Route element={<RequireAuth allowedRoles={[...Object.values(ROLES)]} />}>

            <Route element={<Prefetch />}>
              <Route path="dash" element={<DashLayout />}>

                <Route index element={<Welcome />} />
                
                <Route path="notes">
                    <Route index element={<NotesList />} />
                    <Route path=":id" element={<EditNote />} />
                    <Route path="new" element={<NewNote />} />
                </Route>
                
                <Route path="gumruk">                 
                  <Route path=":id" element={<EditGumruk />} />
                </Route>

                <Route element={<RequireAuth allowedRoles={[ROLES.Manager, ROLES.Admin]} />}>
                  <Route path="users">
                    <Route index element={<UsersList />} />
                    <Route path=":id" element={<EditUser />} />
                    <Route path="new" element={<NewUser />} />
                  </Route>
                </Route>
                <Route element={<RequireAuth allowedRoles={[ROLES.Manager, ROLES.Admin, ROLES.Employee]} />}>
                  
                  <Route path="cikis">                 
                    <Route path=":id" element={<Cikis />} />
                  </Route>

                  <Route path="rapor">                 
                    <Route index element={<Rapor />} />
                    <Route path="detail/:id" element={<NoteDetail/>} />
                    <Route path="edit/:id" element={<EditRapor/>} />
                  </Route>
                </Route>
              </Route>{/* End Dash */}
            </Route>
          </Route>
        </Route>{/* End Protected Routes */}
    </Routes >
    </div>
  );
}

export default App;
