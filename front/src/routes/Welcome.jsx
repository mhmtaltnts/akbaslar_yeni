import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faTruck,
  faUsers,
  faUserPlus,
  faScroll,
} from "@fortawesome/free-solid-svg-icons";
import useAuth from "../utils/hooks/useAuth";
import useTitle from "../utils/hooks/useTitle";
import Title from "../components/title";

const Welcome = () => {
  const { username, isManager, isAdmin, status } = useAuth();

  useTitle(`Gebze Konak Parkı: ${username}`);

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-lg">
      <div className="w-full p-6 ">
        <Title>Hoşgeldiniz, {username}!</Title>

        <div className="space-y-3">
          {(isManager || isAdmin || status === "Çalışan") && (
            <Link
              to="/dash/notes/new"
              className=" w-full text-xl font-semibold py-2 rounded-lg transition flex items-center justify-start gap-2"
            >
              <FontAwesomeIcon icon={faTruck} className="text-mavi text-2xl" />
              Yeni Araç Girişi
            </Link>
          )}

          <Link
            to="/dash/notes"
            className=" w-full text-xl font-semibold py-2 rounded-lg transition flex items-center justify-start gap-2"
          >
            <FontAwesomeIcon icon={faChartBar} className="text-mavi text-2xl" />
            Parkta Mevcut Araçlar
          </Link>

          {(isManager || isAdmin) && (
            <>
              <Link
                to="/dash/users/new"
                className=" w-full text-xl font-semibold py-2 rounded-lg transition flex items-center justify-start gap-2"
              >
                <FontAwesomeIcon
                  icon={faUserPlus}
                  className="text-mavi text-2xl"
                />
                Yeni Kullanıcı Ekle
              </Link>
              <Link
                to="/dash/users"
                className="w-full text-xl font-semibold py-2 rounded-lg transition flex items-center justify-start gap-2"
              >
                <FontAwesomeIcon
                  icon={faUsers}
                  className="text-mavi text-2xl"
                />
                Kullanıcılar ve Ayarlar
              </Link>
            </>
          )}

          {(isManager || isAdmin || status === "Çalışan") && (
            <Link
              to="/dash/rapor"
              className=" w-full text-xl font-semibold py-2 rounded-lg transition flex items-center justify-start gap-2"
            >
              <FontAwesomeIcon icon={faScroll} className="text-mavi text-2xl" />
              Rapor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
