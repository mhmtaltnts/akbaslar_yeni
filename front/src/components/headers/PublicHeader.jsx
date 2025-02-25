import { useNavigate, Link, useLocation } from "react-router-dom";
import { setTheme, selectCurrentTheme } from "../../appStore/themeSlice";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightToBracket,
  faSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";
import Button from "../button";

const ARACLAR_REGEX = /^\/araclar?$/;
const LOGIN_REGEX = /^\/login?$/;

const PublicHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dark = useSelector(selectCurrentTheme);

  const onSystemGoClicked = () => navigate("/login");
  const onThemeClicked = () => dispatch(setTheme({ darkness: !dark }));

  return (
    <header className="h-2x-header flex w-full items-center justify-center px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {/* Logo */}
        <Link to="/" className="text-3xl font-semibold transition">
          {import.meta.env.VITE_APP_TITLE}
        </Link>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          {!ARACLAR_REGEX.test(pathname) && (
            <Link
              className="border px-1 text-xl font-semibold transition"
              to="/araclar"
            >
              Misafir Araçlar
            </Link>
          )}

          {/* Theme Toggle */}
          <Button
            variant="primary"
            title="Tema Değiştir"
            onClick={onThemeClicked}
          >
            <FontAwesomeIcon icon={dark ? faSun : faMoon} className="text-xl" />
          </Button>

          {/* Login Button (Only if not on login page) */}
          {!LOGIN_REGEX.test(pathname) && (
            <Button
              variant="success"
              title="Giriş Yap"
              onClick={onSystemGoClicked}
            >
              <FontAwesomeIcon icon={faRightToBracket} className="text-xl" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
