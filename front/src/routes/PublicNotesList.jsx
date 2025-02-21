import { useState } from "react";
import { useGetNotesQuery } from "../api/notesApiSlice";
import useTitle from "../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import SearchBar from "../components/SearchBar/SearchBar";
import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="p-6">
        <div className="align-items-center mb-4 flex justify-center">
          <SearchBar setSearch={setSearch} />
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full border border-gray-300 text-left dark:border-gray-700">
            <TableHeader className="bg-gray-300 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
              <TableRow>
                <TableHead>Çekici</TableHead>
                <TableHead>Dorse</TableHead>
                <TableHead className="hidden md:table-cell">Firma</TableHead>
                <TableHead>Giriş Tarihi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-gray-900 dark:text-gray-100">
              {tableContent}
            </TableBody>
          </Table>
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
    options,
  );
  if (note) {
    return (
      <TableRow>
        <TableCell className="p-3">{note.getiren}</TableCell>
        <TableCell className="p-3">{note.dorse}</TableCell>
        <TableCell className="hidden p-3 md:table-cell">{note.firma}</TableCell>
        <TableCell className="p-3">{girisTarihi}</TableCell>
      </TableRow>
    );
  } else return null;
};

PublicNote.propTypes = {
  noteId: PropTypes.string.isRequired,
};

export default PublicNotesList;
