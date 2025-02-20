import { useParams, useNavigate } from "react-router-dom";
import { useGetNotesQuery, useGumrukBilgiMutation } from "../api/notesApiSlice";
import moment from "moment";
import PulseLoader from "react-spinners/PulseLoader";
import useTitle from "../utils/hooks/useTitle";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import useAuth from "../utils/hooks/useAuth";
import PropTypes from "prop-types";
import Title from "../components/title";

const EditGumruk = () => {
  useTitle("Gümrük Girişi");
  const { id } = useParams();

  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({
      note: data?.entities[id],
    }),
  });

  if (!note) return <PulseLoader color={"#4F46E5"} />;

  return <EditGumrukForm note={note} />;
};

const EditGumrukForm = ({ note }) => {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [gumrukBilgi, setgumrukBilgi] = useState(note.gumrukBilgi ?? "");
  const [gumrukBilgiNote, { isLoading, isSuccess, isError, error }] =
    useGumrukBilgiMutation();

  useEffect(() => {
    if (isSuccess) {
      setgumrukBilgi("");
      navigate("/dash/notes");
    }
  }, [isSuccess, navigate]);

  const canSave = gumrukBilgi.trim() !== "" && !isLoading;

  const onSaveNoteClicked = async () => {
    if (canSave) {
      await gumrukBilgiNote({
        id: note.id,
        user: username,
        gumrukBilgi,
        gumrukBilgiTarihi: Date.now(),
      });
    }
  };

  return (
    <div className="flex flex-col justify-center items-center   p-4">
      {isError && (
        <p className="text-red-500 text-sm">{error?.data?.message}</p>
      )}
      <Title>Gümrük</Title>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="block text-gray-700 dark:text-gray-300"
            htmlFor="gumrukBilgi"
          >
            Gümrük Kaydı
          </label>
          <textarea
            className="bg-amber-50 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            id="gumrukBilgi"
            placeholder="Gümrük bilgilerini yazınız"
            value={gumrukBilgi}
            onChange={(e) => setgumrukBilgi(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dorse Plakası" value={note.dorse} />
          <Field label="Getiren Çekici" value={note.getiren} />
          <Field label="Firma" value={note.firma} />
          <Field
            label="Giriş Tarihi"
            value={moment(note.girisTarihi).format("YYYY-MM-DDTHH:mm")}
            type="datetime-local"
          />
        </div>
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
          onClick={onSaveNoteClicked}
          disabled={!canSave}
        >
          <FontAwesomeIcon icon={faSave} />
          <span>Kaydet</span>
        </button>
      </form>
    </div>
  );
};

const Field = ({ label, value, type = "text" }) => (
  <div>
    <label className="block text-gray-700 dark:text-gray-300">{label}</label>
    <input
      className="bg-amber-50 w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white"
      type={type}
      value={value}
      disabled
    />
  </div>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  type: PropTypes.string,
};

EditGumrukForm.propTypes = {
  note: PropTypes.object.isRequired,
};

export default EditGumruk;
