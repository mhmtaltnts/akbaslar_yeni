import { useState } from "react";
import { useGetNotesQuery } from "../api/notesApiSlice";
import useTitle from "../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import SearchBar from "../components/SearchBar/SearchBar";
import PropTypes from "prop-types";

const PublicNotesList = () => {
  useTitle("Kayıtları Listele");

  const [search, setSearch] = useState("");

  const {
    data: notes,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useGetNotesQuery("notesList", {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  let content;

  if (isLoading) content = <PulseLoader color={"#FFF"} />;

  if (isError) {
    content = <p className="text-red-500">{error?.data?.message}</p>;
  }

  if (isSuccess) {
    let filteredIds;
    const { ids, entities } = notes;
    if (!search) {
      filteredIds = [...ids];
    } else {
      filteredIds = ids.filter((noteId) => {
        return (
          entities[noteId].dorse
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          entities[noteId].getiren
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          entities[noteId].firma?.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    const tableContent =
      ids?.length &&
      filteredIds.map((noteId) => <PublicNote key={noteId} noteId={noteId} />);

    content = (
      <div className=" p-6">
        <div className="mb-4 flex align-items-center justify-center">
          <SearchBar setSearch={setSearch} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 dark:border-gray-700 text-left">
            <thead className="bg-gray-300 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              <tr>
                <th className="p-3 border-b border-gray-300 dark:border-gray-700">
                  Getiren Çekici
                </th>
                <th className="p-3 border-b border-gray-300 dark:border-gray-700">
                  Dorse Plakası
                </th>
                <th className="p-3 border-b border-gray-300 dark:border-gray-700">
                  Firma
                </th>
                <th className="p-3 border-b border-gray-300 dark:border-gray-700">
                  Giriş Tarihi
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-900 dark:text-gray-100">
              {tableContent}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return content;
};

const PublicNote = ({ noteId }) => {
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({
      note: data?.entities[noteId],
    }),
  });

  let options = {
    dateStyle: "short",
    timeStyle: "short",
  };

  const girisTarihi = new Date(note.girisTarihi).toLocaleString(
    "tr-TR",
    options
  );
  if (note) {
    return (
      <tr className="border-b border-gray-300 dark:border-gray-700">
        <td className="p-3">{note.getiren}</td>
        <td className="p-3">{note.dorse}</td>
        <td className="p-3">{note.firma}</td>
        <td className="p-3">{girisTarihi}</td>
      </tr>
    );
  } else return null;
};

PublicNote.propTypes = {
  noteId: PropTypes.string.isRequired,
};

export default PublicNotesList;
