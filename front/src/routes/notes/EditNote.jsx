import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  useGetNotesQuery,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} from "../../api/notesApiSlice";
import useAuth from "../../utils/hooks/useAuth";
import useTitle from "../../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import PropTypes from "prop-types";
import Title from "../../components/title";

const EditNote = () => {
  useTitle("Kayıt Düzenle");
  const { id } = useParams();
  const { username, isManager, isAdmin } = useAuth();

  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({
      note: data?.entities[id],
    }),
  });

  if (!note) return <PulseLoader color={"#4A90E2"} />;
  if (!isManager && !isAdmin && note.username !== username) {
    return (
      <p className="text-red-600 text-lg font-semibold text-center">
        Erişim Engeli
      </p>
    );
  }

  return <EditNoteForm note={note} />;
};

const EditNoteForm = ({ note }) => {
  const { username, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [updateNote, { isLoading, isSuccess }] = useUpdateNoteMutation();
  const [deleteNote, { isSuccess: isDelSuccess }] = useDeleteNoteMutation();

  const [getiren, setGetiren] = useState(note.getiren);
  const [dorse, setDorse] = useState(note.dorse);
  const [firma, setFirma] = useState(note.firma);
  const [mal, setMal] = useState(note.mal);
  const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi ?? "");

  useEffect(() => {
    if (isSuccess || isDelSuccess) {
      navigate("/dash/notes");
    }
  }, [isSuccess, isDelSuccess, navigate]);

  const canSave = [getiren, dorse].every(Boolean) && !isLoading;

  const onSaveNoteClicked = async () => {
    if (canSave) {
      await updateNote({
        id: note.id,
        user: username,
        getiren,
        dorse,
        firma,
        mal,
        girisTarihi,
        guncellemeTarihi: Date.now(),
      });
    }
  };

  const onDeleteNoteClicked = async () => {
    if (window.confirm(`${note.dorse} Silmek istediğinizden emin misiniz?`)) {
      await deleteNote({ id: note.id });
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen  p-6 w-full max-w-lg">
      <Title>Kayıt Düzenle</Title>

      <form className="space-y-4 w-full" onSubmit={(e) => e.preventDefault()}>
        <label className="block text-gray-700 dark:text-white">
          Getiren Çekici Plakası:
        </label>
        <input
          className="bg-amber-50 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          type="text"
          value={getiren}
          onChange={(e) => setGetiren(e.target.value)}
          autoFocus
          required
        />

        <label className="block text-gray-700 dark:text-white">
          Dorse Plakası:
        </label>
        <input
          className="bg-amber-50 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          type="text"
          value={dorse}
          onChange={(e) => setDorse(e.target.value)}
          required
        />

        <label className="block text-gray-700 dark:text-white">Firma:</label>
        <input
          className="bg-amber-50 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          type="text"
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
        />

        <label className="block text-gray-700 dark:text-white">
          Malın Cinsi:
        </label>
        <input
          className="bg-amber-50 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          type="text"
          value={mal}
          onChange={(e) => setMal(e.target.value)}
        />

        <label className="block text-gray-700 dark:text-white">
          Giriş Tarihi:
        </label>
        <input
          className="bg-amber-50 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          type="datetime-local"
          value={moment(girisTarihi).format("YYYY-MM-DDTHH:mm")}
          onChange={(e) => setGirisTarihi(new Date(e.target.value).getTime())}
        />

        <div className="flex justify-between mt-4">
          <button
            className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition"
            onClick={onSaveNoteClicked}
            disabled={!canSave}
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            Kaydet
          </button>

          {isManager || isAdmin ? (
            <button
              className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition"
              onClick={onDeleteNoteClicked}
            >
              <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
              Sil
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
};

EditNoteForm.propTypes = {
  note: PropTypes.object.isRequired,
};

export default EditNote;
