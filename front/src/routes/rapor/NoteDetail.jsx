import { useParams } from "react-router-dom";
import { useGetRaporQuery } from "../../api/notesApiSlice";
import PulseLoader from "react-spinners/PulseLoader";
import useTitle from "../../utils/hooks/useTitle";
import { selectCurrentPage } from "../../appStore/pageSlice";
import { useSelector } from "react-redux";
import moment from "moment";
import PropTypes from "prop-types";
import Title from "../../components/title";

const NoteDetail = () => {
  useTitle("Kayıt Düzenle");

  const { id } = useParams();
  const page = useSelector(selectCurrentPage);
  const { note } = useGetRaporQuery(page, {
    selectFromResult: ({ data }) => ({
      note: data?.notes.entities[id],
    }),
  });

  if (!note) return <PulseLoader color={"#FFF"} />;

  const content = <NoteForm note={note} />;
  return content;
};

const NoteForm = ({ note }) => {
  const guncellemeTarihi =
    note.guncellemeTarihi === undefined
      ? ""
      : moment(note.guncellemeTarihi).format("DD.MM.YYYY HH:mm");
  const gumrukTarihi =
    note.gumrukBilgiTarihi === undefined
      ? ""
      : moment(note.gumrukBilgiTarihi).format("DD.MM.YYYY HH:mm");

  const content = (
    <div className="p-4 min-h-screen w-full max-w-xl">
      <div className="mb-6">
        <Title className="text-2xl font-semibold text-gray-800 dark:text-white">
          Araç Hakkında Detay
        </Title>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* Giriş Yapan */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="girisYapan"
          >
            Giriş Yapan:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="girisYapan"
            name="girisYapan"
            type="text"
            autoComplete="off"
            value={note.girisYapan}
            disabled
          />
        </div>

        {/* Giriş Tarihi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="girisTarihi"
          >
            Giriş Tarihi:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="girisTarihi"
            name="girisTarihi"
            type="text"
            autoComplete="off"
            value={moment(note.girisTarihi).format("DD.MM.YYYY HH:mm")}
            disabled
          />
        </div>

        {/* Getiren Çekici Plakası */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="getiren"
          >
            Getiren Çekici Plakası:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="getiren"
            name="getiren"
            type="text"
            autoComplete="off"
            value={note.getiren}
            disabled
          />
        </div>

        {/* Dorse Plakası */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="dorse"
          >
            Dorse Plakası:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="dorse"
            name="dorse"
            type="text"
            autoComplete="off"
            value={note.dorse}
            disabled
          />
        </div>

        {/* Firma */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="firma"
          >
            Firma:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="firma"
            name="firma"
            type="text"
            autoComplete="off"
            value={note.firma}
            disabled
          />
        </div>

        {/* Malın Cinsi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="mal"
          >
            Malın Cinsi:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="mal"
            name="mal"
            type="text"
            autoComplete="off"
            value={note.mal}
            disabled
          />
        </div>

        {/* Gümrük Bilgi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="gumrukBilgi"
          >
            Gümrük Bilgi:
          </label>
          <textarea
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="gumrukBilgi"
            name="gumrukBilgi"
            rows="3"
            value={note.gumrukBilgi}
            disabled
          />
        </div>

        {/* Gümrük Giriş Tarihi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="gumrukBilgi"
          >
            Gümrük Giriş Tarihi:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="gumrukBilgi"
            name="gumrukBilgi"
            type="text"
            autoComplete="off"
            value={gumrukTarihi}
            disabled
          />
        </div>

        {/* Gümrük Girişi Yapan */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="gumrukBilgi"
          >
            Gümrük Girişi Yapan:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="gumrukBilgi"
            name="gumrukBilgi"
            type="text"
            autoComplete="off"
            value={note.gumrukYapan}
            disabled
          />
        </div>

        {/* Götüren Çekici Plakası */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="goturen"
          >
            Götüren Çekici Plakası:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="goturen"
            name="goturen"
            type="text"
            autoComplete="off"
            value={note.goturen}
            disabled
          />
        </div>

        {/* Çıkış Tarihi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="ct"
          >
            Çıkış Tarihi:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="ct"
            name="ct"
            type="text"
            value={moment(note.cikisTarihi).format("DD.MM.YYYY HH:mm")}
            disabled
          />
        </div>

        {/* Çıkış Yapan */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="cy"
          >
            Çıkış Yapan:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="cy"
            name="cy"
            type="text"
            autoComplete="off"
            value={note.cikisYapan}
            disabled
          />
        </div>

        {/* Değiştirme Tarihi */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="gT"
          >
            Değiştirme Tarihi:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="gT"
            name="gT"
            type="text"
            autoComplete="off"
            value={guncellemeTarihi}
            disabled
          />
        </div>

        {/* Değiştiren */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="guncelleme"
          >
            Değiştiren:
          </label>
          <input
            className="bg-amber-50 mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            id="guncelleme"
            name="guncelleme"
            type="text"
            autoComplete="off"
            value={note.guncellemeYapan}
            disabled
          />
        </div>
      </form>
    </div>
  );

  return content;
};

NoteForm.propTypes = {
  note: PropTypes.object.isRequired,
};

export default NoteDetail;
