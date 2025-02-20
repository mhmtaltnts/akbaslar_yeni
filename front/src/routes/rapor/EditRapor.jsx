import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetRaporQuery,
  useUpdateRaporMutation,
  useDeleteNoteMutation,
} from "../../api/notesApiSlice";
import PulseLoader from "react-spinners/PulseLoader";
import useTitle from "../../utils/hooks/useTitle";
import { selectCurrentPage } from "../../appStore/pageSlice";
import { useSelector } from "react-redux";
import useAuth from "../../utils/hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import Title from "../../components/title";

const EditRapor = () => {
  useTitle("Kayıt Düzenle");

  const { id } = useParams();
  const page = useSelector(selectCurrentPage);
  const { note } = useGetRaporQuery(page, {
    selectFromResult: ({ data }) => ({
      note: data?.notes.entities[id],
    }),
  });

  if (!note) return <PulseLoader color={"#FFF"} />;

  const content = <EditNoteForm note={note} />;
  return content;
};

const EditNoteForm = ({ note }) => {
  const { username, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dorse, setDorse] = useState(note.dorse ?? "");
  const [getiren, setGetiren] = useState(note.getiren ?? "");
  const [goturen, setGoturen] = useState(note.goturen ?? "");
  const [firma, setFirma] = useState(note.firma ?? "");
  const [mal, setMal] = useState(note.mal ?? "");
  const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi ?? "");
  const [cikisTarihi, setCikisTarihi] = useState(note.cikisTarihi ?? "");
  const [gumrukBilgi, setgumrukBilgi] = useState(note.gumrukBilgi);
  const [gumrukBilgiTarihi, setgumrukBilgiTarihi] = useState(
    note.gumrukBilgiTarihi ?? ""
  );

  const [updateRapor, { isLoading, isSuccess, isError, error }] =
    useUpdateRaporMutation();

  const onDorseChanged = (e) => setDorse(e.target.value);
  const onGetirenChanged = (e) => setGetiren(e.target.value);
  const onGoturenChanged = (e) => setGoturen(e.target.value);
  const onFirmaChanged = (e) => setFirma(e.target.value);
  const onMalChanged = (e) => setMal(e.target.value);
  const onGirisTarihiChanged = (e) =>
    setGirisTarihi(new Date(`${e.target.value}`).getTime());
  const onCikisTarihiChanged = (e) =>
    setCikisTarihi(new Date(`${e.target.value}`).getTime());
  const ongumrukBilgiChanged = (e) => setgumrukBilgi(e.target.value);
  const ongumrukBilgiTarihiChanged = (e) =>
    setgumrukBilgiTarihi(new Date(`${e.target.value}`).getTime());

  const onSaveRaporClicked = async () => {
    await updateRapor({
      id: note.id,
      user: username,
      dorse,
      getiren,
      goturen,
      firma,
      mal,
      girisTarihi,
      cikisTarihi,
      gumrukBilgi,
      gumrukBilgiTarihi,
      guncellemeTarihi: Date.now(),
    });
  };

  const [deleteNote, { isSuccess: isDelSuccess, isError: isDelError }] =
    useDeleteNoteMutation();

  const onDeleteNoteClicked = async () => {
    if (
      window.confirm(`${note.dorse} Silmek istediğinizden emin misiniz?`) ===
      true
    ) {
      await deleteNote({ id: note.id });
    } else return;
  };

  useEffect(() => {
    if (isSuccess || isDelSuccess) {
      navigate("/dash/rapor");
    }
  }, [isSuccess, isDelSuccess, navigate]);

  let content;

  if (isLoading) content = <PulseLoader color={"#FFF"} />;

  if (isError || isDelError) {
    content = (
      <p className="text-red-500 dark:text-red-400 text-sm">
        {error?.data?.message}
      </p>
    );
  }

  content = (
    <div className="p-4 min-h-screen w-full max-w-xl">
      <Title>Araç Bilgi Düzenle</Title>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
            onChange={onDorseChanged}
            value={dorse}
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
            onChange={onGetirenChanged}
            value={getiren}
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
            onChange={onGoturenChanged}
            value={goturen}
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
            onChange={onFirmaChanged}
            value={firma}
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
            onChange={onMalChanged}
            value={mal}
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
            type="datetime-local"
            onChange={onGirisTarihiChanged}
            value={moment(girisTarihi).format("YYYY-MM-DDTHH:mm")}
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
            type="datetime-local"
            onChange={onCikisTarihiChanged}
            value={moment(cikisTarihi).format("YYYY-MM-DDTHH:mm")}
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
            onChange={ongumrukBilgiChanged}
            value={gumrukBilgi}
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
            type="datetime-local"
            onChange={ongumrukBilgiTarihiChanged}
            value={moment(gumrukBilgiTarihi).format("YYYY-MM-DDTHH:mm")}
          />
        </div>
        <div className="flex justify-between items-center mb-6 ">
          {(isAdmin || isManager) && (
            <div className="flex gap-2 w-full">
              <button
                className="w-full p-2 bg-yesil text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                title="Kaydet"
                onClick={onSaveRaporClicked}
              >
                <FontAwesomeIcon icon={faSave} />
              </button>
              <button
                className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                title="Sil"
                onClick={onDeleteNoteClicked}
              >
                <FontAwesomeIcon icon={faTrashCan} />
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );

  return content;
};

export default EditRapor;
