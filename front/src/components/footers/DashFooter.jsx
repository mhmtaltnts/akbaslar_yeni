import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faHouse,
  faSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../utils/hooks/useAuth";
import { selectCurrentTheme } from "../../appStore/themeSlice";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "../../appStore/themeSlice";

const DashFooter = () => {
  const { fullName } = useAuth();
  const dispatch = useDispatch();
  const dark = useSelector(selectCurrentTheme);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onThemeClicked = () => {
    dispatch(setTheme({ darkness: !dark }));
  };

  let goHomeButton = null;
  if (pathname !== "/dash") {
    goHomeButton = (
      <button
        className="p-2 text-lg text-gray-700 dark:text-gray-300 hover:text-blue-500"
        title="Ana Panel"
        onClick={() => navigate("/dash")}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
    );
  }

  if (pathname === "/dash") {
    goHomeButton = (
      <button
        className="p-2 text-lg text-gray-700 dark:text-gray-300 hover:text-blue-500"
        title="Ana Sayfa"
        onClick={() => navigate("/")}
      >
        <FontAwesomeIcon icon={faHouse} />
      </button>
    );
  }

  return (
    <footer className="h-footer w-full py-3 px-4 ">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        {goHomeButton}
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Sağlıklı günler, &quot;{fullName}&quot;
          </h2>
        </div>
        <button
          className="p-2 text-lg text-gray-700 dark:text-gray-300 hover:text-blue-500"
          title="Tema Değiştir"
          onClick={onThemeClicked}
        >
          <FontAwesomeIcon icon={dark ? faSun : faMoon} />
        </button>
      </div>
    </footer>
  );
};

export default DashFooter;
