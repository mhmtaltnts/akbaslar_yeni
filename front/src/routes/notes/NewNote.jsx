import useTitle from "../../utils/hooks/useTitle";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../utils/hooks/useAuth";
import { useAddNewNoteMutation } from "../../api/notesApiSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import Title from "../../components/title";

const NewNote = () => {
  useTitle("Yeni Park Girişi");
  return <NewNoteForm />;
};

const NewNoteForm = () => {
  const { username } = useAuth();
  const [addNewNote, { isLoading, isSuccess, isError, error }] =
    useAddNewNoteMutation();
  const navigate = useNavigate();

  const [getiren, setGetiren] = useState("");
  const [dorse, setDorse] = useState("");
  const [firma, setFirma] = useState("");
  const [mal, setMal] = useState("");

  useEffect(() => {
    if (isSuccess) {
      setGetiren("");
      setDorse("");
      setFirma("");
      setMal("");
      navigate("/dash/notes");
    }
  }, [isSuccess, navigate]);

  const canSave = [getiren, dorse].every(Boolean) && !isLoading;

  const onSaveNoteClicked = async (e) => {
    e.preventDefault();
    if (canSave) {
      await addNewNote({
        user: username,
        getiren,
        dorse,
        firma,
        mal,
        girisTarihi: Date.now(),
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-lg ">
      <div className="w-full p-6">
        {isError && (
          <p className="text-red-500 dark:text-red-400 text-sm mb-4">
            {error?.data?.message}
          </p>
        )}
        <Title>Yeni Park Girişi</Title>
        <form
          className="space-y-4"
          onSubmit={onSaveNoteClicked}
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="getiren"
              className="block text-sm font-medium text-gray-900 dark:text-gray-200"
            >
              Getiren Çekici Plakası:
            </label>
            <input
              id="getiren"
              name="getiren"
              type="text"
              value={getiren}
              onChange={(e) => setGetiren(e.target.value.toUpperCase())}
              className={`bg-amber-50 w-full border rounded-md p-2 mt-1  dark:bg-gray-700 dark:text-gray-200 ${
                !getiren
                  ? "border-red-500 dark:border-red-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="dorse"
              className="block text-sm font-medium text-gray-900 dark:text-gray-200"
            >
              Dorse Plakası:
            </label>
            <input
              id="dorse"
              name="dorse"
              type="text"
              value={dorse}
              onChange={(e) => setDorse(e.target.value.toUpperCase())}
              className={`w-full border rounded-md p-2 mt-1 bg-amber-50 dark:bg-gray-700 dark:text-gray-200 ${
                !dorse
                  ? "border-red-500 dark:border-red-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
          </div>
          <div>
            <label
              htmlFor="firma"
              className="block text-sm font-medium text-gray-900 dark:text-gray-200"
            >
              Firma:
            </label>
            <input
              id="firma"
              name="firma"
              type="text"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              className="w-full border rounded-md p-2 mt-1 border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label
              htmlFor="mal"
              className="block text-sm font-medium text-gray-900 dark:text-gray-200"
            >
              Malın Cinsi:
            </label>
            <input
              id="mal"
              name="mal"
              type="text"
              value={mal}
              onChange={(e) => setMal(e.target.value)}
              className="w-full border rounded-md p-2 mt-1 border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="flex justify-between items-center mb-6">
            <button
              type="submit"
              className="w-full bg-yesil text-white px-4 py-2 rounded-md disabled:bg-gray-400 dark:bg-green-600 dark:disabled:bg-gray-500"
              disabled={!canSave}
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" /> Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewNote;
