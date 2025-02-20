import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTruck,
  faChartBar,
  faUsers,
  faUserPlus,
  faRightFromBracket,
  faScroll,
  faSun,
  faMoon,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSendLogoutMutation } from "../../api/authApiSlice";
import useAuth from "../../utils/hooks/useAuth";
import PulseLoader from "react-spinners/PulseLoader";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentTheme, setTheme } from "../../appStore/themeSlice";
import Button from "../button";

const NOTES_REGEX = /^\/dash\/notes(\/)?$/;
const USERS_REGEX = /^\/dash\/users(\/)?$/;
const RAPOR_REGEX = /^\/dash\/rapor(\/)?$/;
const DASH_REGEX = /^\/dash(\/)?$/;

const DashHeader = () => {
  const { isManager, isAdmin, status } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dark = useSelector(selectCurrentTheme);
  const { pathname } = useLocation();
  const [sendLogout, { isLoading, isSuccess, isError, error }] =
    useSendLogoutMutation();

  useEffect(() => {
    if (isSuccess) navigate("/");
  }, [isSuccess, navigate]);

  const onNewNoteClicked = () => navigate("/dash/notes/new");
  const onNewUserClicked = () => navigate("/dash/users/new");
  const onNotesClicked = () => navigate("/dash/notes");
  const onUsersClicked = () => navigate("/dash/users");
  const onRaporClicked = () => navigate("/dash/rapor");
  const onThemeClicked = () => {
    dispatch(setTheme({ darkness: !dark }));
  };

  return (
    <header className="h-2x-header  w-full flex items-center justify-between py-4 px-6 ">
      <div className="w-full mx-auto flex flex-col items-center sm:flex-row sm:justify-between gap-3">
        {/* Error Message */}
        {isError && <p className="text-red-500">{error?.data?.message}</p>}

        {/* Logo */}
        <Link
          to="/"
          className="text-center text-3xl md:text-4xl font-semibold transition"
        >
          {import.meta.env.VITE_APP_TITLE}
        </Link>
        {/* Theme Button */}
        <Button
          variant="primary"
          className="hidden md:block"
          title="Tema Değiştir"
          onClick={onThemeClicked}
        >
          <FontAwesomeIcon icon={dark ? faSun : faMoon} className="w-6 h-6" />
        </Button>
        {/* Navigation Buttons */}
        <nav className="flex items-center gap-2 md:gap-4">
          <Button
            variant="primary"
            className="md:hidden"
            title="Tema Değiştir"
            onClick={onThemeClicked}
          >
            <FontAwesomeIcon icon={dark ? faSun : faMoon} className="w-6 h-6" />
          </Button>
          {/* Rapor */}
          {!RAPOR_REGEX.test(pathname) && pathname.includes("/dash") && (
            <Button variant="primary" title="Rapor" onClick={onRaporClicked}>
              <FontAwesomeIcon icon={faScroll} className="text-xl" />
            </Button>
          )}

          {/* New Note */}
          {status !== "Memur" && NOTES_REGEX.test(pathname) && (
            <Button
              variant="primary"
              title="Yeni Giriş"
              onClick={onNewNoteClicked}
            >
              <FontAwesomeIcon icon={faTruck} className="text-xl" />
            </Button>
          )}

          {/* New User */}
          {USERS_REGEX.test(pathname) && (
            <Button
              variant="primary"
              title="Yeni Kullanıcı"
              onClick={onNewUserClicked}
            >
              <FontAwesomeIcon icon={faUserPlus} className="text-xl" />
            </Button>
          )}

          {/* Notes */}
          {status !== "Memur" &&
            !NOTES_REGEX.test(pathname) &&
            pathname.includes("/dash") && (
              <Button
                variant="primary"
                title="Parkta Mevcut Araçlar"
                onClick={onNotesClicked}
              >
                <FontAwesomeIcon icon={faChartBar} className="text-xl" />
              </Button>
            )}

          {/* Users */}
          {(isManager || isAdmin) &&
            !USERS_REGEX.test(pathname) &&
            pathname.includes("/dash") && (
              <Button
                variant="primary"
                title="Kullanıcılar"
                onClick={onUsersClicked}
              >
                <FontAwesomeIcon icon={faUsers} className="text-xl" />
              </Button>
            )}
          {/* Home */}
          {!DASH_REGEX.test(pathname) && (
            <Button
              variant="primary"
              title="Ana Panel"
              onClick={() => navigate("/dash")}
            >
              <FontAwesomeIcon icon={faHome} className="text-xl" />
            </Button>
          )}

          {/* Logout */}
          <Button variant="danger" title="Çıkış" onClick={sendLogout}>
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xl" />
          </Button>
        </nav>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center mt-2">
          <PulseLoader color={"#FFF"} />
        </div>
      )}
    </header>
  );
};

export default DashHeader;
