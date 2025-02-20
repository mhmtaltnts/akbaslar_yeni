import { useParams, useNavigate } from "react-router-dom";
import { useGetNotesQuery, useCikisMutation } from "../api/notesApiSlice";
import PulseLoader from "react-spinners/PulseLoader";
import useTitle from "../utils/hooks/useTitle";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import useAuth from "../utils/hooks/useAuth";
import moment from "moment";
import PropTypes from "prop-types";

const Cikis = () => {
  useTitle("Çıkış Yap");
  const { id } = useParams();
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({
      note: data?.entities[id],
    }),
  });

  if (!note) return <PulseLoader color={"#FFF"} />;
  return <CikisForm note={note} />;
};

const CikisForm = ({ note }) => {
  const { username } = useAuth();
  const [cikisNote, { isLoading, isSuccess, isError, error }] =
    useCikisMutation();
  const navigate = useNavigate();
  const [goturen, setGoturen] = useState("");

  useEffect(() => {
    if (isSuccess) {
      setGoturen("");
      navigate("/dash/notes");
    }
  }, [isSuccess, navigate]);

  const onGoturenChanged = (e) => setGoturen(e.target.value.toUpperCase());
  const canSave = [goturen].every(Boolean) && !isLoading;

  const onSaveNoteClicked = async () => {
    if (canSave) {
      await cikisNote({
        id: note.id,
        user: username,
        goturen,
        cikisTarihi: Date.now(),
      });
    }
  };

  return (
    <div className="flex flex-col justify-start items-center rounded-lg p-6 w-full max-w-xl">
      {isError && (
        <p className="text-red-500 text-sm mb-2">{error?.data?.message}</p>
      )}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4">
        Park Araç Çıkışı
      </h2>

      <form className="space-y-4 w-full" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            htmlFor="goturen"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Götüren Çekici
          </label>
          <input
            className={`bg-amber-50 w-full p-2 border rounded-md text-gray-900 dark:text-gray-200  dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !goturen ? "border-red-500" : ""
            }`}
            id="goturen"
            type="text"
            value={goturen}
            placeholder="Götüren Çekici Plakası Giriniz"
            onChange={onGoturenChanged}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <TextInput label="Dorse Plakası" value={note.dorse} disabled />
          <TextInput label="Getiren Çekici" value={note.getiren} disabled />
          <TextInput label="Firma" value={note.firma} disabled />
          <TextInput
            label="Giriş Tarihi"
            value={moment(note.girisTarihi).format("YYYY-MM-DDTHH:mm")}
            disabled
          />
        </div>

        <button
          className=" w-full flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400"
          onClick={onSaveNoteClicked}
          disabled={!canSave}
        >
          <FontAwesomeIcon icon={faSave} className="mr-2" /> Kaydet
        </button>
      </form>
    </div>
  );
};

const TextInput = ({ label, value, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <input
      className="bg-amber-50 w-full p-2 border rounded-md  dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      type="text"
      value={value}
      disabled={disabled}
    />
  </div>
);

TextInput.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

CikisForm.propTypes = {
  note: PropTypes.object.isRequired,
};

export default Cikis;
