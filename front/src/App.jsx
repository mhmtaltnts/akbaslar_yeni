import { Routes, Route } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import DashLayout from "./layouts/DashLayout";
import Public from "../../front/src/routes/Public";
import Login from "../../front/src/routes/Login";
import PublicNotesList from "../../front/src/routes/PublicNotesList";
import Welcome from "../../front/src/routes/Welcome";
import NotesList from "../../front/src/routes/notes/NotesList";
import NoteDetail from "../../front/src/routes/rapor/NoteDetail";
import NewNote from "../../front/src/routes/notes/NewNote";
import EditNote from "../../front/src/routes/notes/EditNote";
import UsersList from "../../front/src/routes/users/UsersList";
import EditUser from "../../front/src/routes/users/EditUser";
import NewUser from "../../front/src/routes/users/NewUser";
import Rapor from "../../front/src/routes/rapor/Rapor";
import EditRapor from "../../front/src/routes/rapor/EditRapor";
import Cikis from "../../front/src/routes/Cikis";
import EditGumruk from "../../front/src/routes/EditGumruk";
import Prefetch from "../../front/src/hoc/Prefetch";
import PersistLogin from "../../front/src/hoc/PersistLogin";
import RequireAuth from "../../front/src/hoc/RequireAuth";
import { ROLES } from "../../front/src/utils/config/roles";
import useTitle from "../../front/src/utils/hooks/useTitle";
import { selectCurrentTheme } from "../../front/src/appStore/themeSlice";
import { useSelector } from "react-redux";

function App() {
  useTitle("Gebze Konak Tır Parkı");
  const dark = useSelector(selectCurrentTheme);

  return (
    <div className={dark ? `dark` : `light`}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          {/* public routes */}
          <Route index element={<Public />} />
          <Route path="araclar" element={<PublicNotesList />} />
          <Route path="login" element={<Login />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<PersistLogin />}>
          <Route
            element={<RequireAuth allowedRoles={[...Object.values(ROLES)]} />}
          >
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
                <Route path="rapor">
                  <Route index element={<Rapor />} />
                  <Route path="detail/:id" element={<NoteDetail />} />
                  <Route path="edit/:id" element={<EditRapor />} />
                </Route>

                <Route path="rapor">
                  <Route index element={<Rapor />} />
                  <Route path="detail/:id" element={<NoteDetail />} />
                  <Route path="edit/:id" element={<EditRapor />} />
                </Route>

                <Route
                  element={
                    <RequireAuth allowedRoles={[ROLES.Manager, ROLES.Admin]} />
                  }
                >
                  <Route path="users">
                    <Route index element={<UsersList />} />
                    <Route path=":id" element={<EditUser />} />
                    <Route path="new" element={<NewUser />} />
                  </Route>
                </Route>
                <Route
                  element={
                    <RequireAuth
                      allowedRoles={[
                        ROLES.Manager,
                        ROLES.Admin,
                        ROLES.Employee,
                      ]}
                    />
                  }
                >
                  <Route path="cikis">
                    <Route path=":id" element={<Cikis />} />
                  </Route>
                </Route>
              </Route>
              {/* End Dash */}
            </Route>
          </Route>
        </Route>
        {/* End Protected Routes */}
      </Routes>
    </div>
  );
}

export default App;
