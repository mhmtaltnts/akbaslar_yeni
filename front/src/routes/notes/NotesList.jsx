import { useState } from "react";
import { useGetNotesQuery } from "../../api/notesApiSlice";
import useTitle from "../../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import SearchBar from "../../components/SearchBar/SearchBar";

import useAuth from "../../utils/hooks/useAuth";
import PropTypes from "prop-types";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableData,
  TableBody,
} from "../../components/table";

import DropdownMenu from "@/components/dropdown-notes";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPersonMilitaryPointing,
  faSignOut,
} from "@fortawesome/free-solid-svg-icons";

const NotesList = () => {
  useTitle("Kayıtları Listele");
  const [search, setSearch] = useState("");

  const { isAdmin, isManager, status } = useAuth();

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
  if (isLoading) content = <PulseLoader color={"rgba(211, 204, 204, 0.703)"} />;
  if (isError) {
    content = (
      <p className="text-red-500 dark:text-red-400">{error?.data?.message}</p>
    );
  }

  if (isSuccess) {
    let filteredIds;
    const { ids, entities } = notes;
    let count = ids.length;
    filteredIds = search
      ? ids.filter((noteId) =>
          [
            "dorse",
            "getiren",
            "firma",
            "mal",
            "gumrukBilgi",
            "girisYapan",
          ].some((key) =>
            entities[noteId][key]?.toLowerCase().includes(search.toLowerCase())
          )
        )
      : [...ids];

    const tableContent =
      ids?.length &&
      filteredIds.map((noteId) => <Note key={noteId} noteId={noteId} />);

    content = (
      <div className="flex flex-col items-center justify-center p-1 md:p-6 w-full max-w-[99%]">
        <div className="flex justify-center gap-3 items-center mb-4 w-full">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-900 bg-sari rounded-full px-1">
            {count}
          </h2>
          <SearchBar setSearch={setSearch} />
        </div>

        <div className="overflow-x-auto w-full max-w-screen">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Çekici</TableHeader>
                <TableHeader>Dorse</TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Firma
                </TableHeader>
                <TableHeader className="hidden md:table-cell">Yükü</TableHeader>
                <TableHeader>Gümrük Bilgi</TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Giriş Tarihi
                </TableHeader>
                <TableHeader>Giriş Yapan</TableHeader>

                {status == "Memur" && <TableHeader>Gümrük</TableHeader>}
                {status == "Çalışan" && <TableHeader>Çıkış</TableHeader>}
                {(isAdmin || isManager) && <TableHeader>Menü</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>{tableContent}</TableBody>
          </Table>
        </div>
      </div>
    );
  }
  return content;
};

const Note = ({ noteId }) => {
  const { isManager, isAdmin, status } = useAuth();
  const navigate = useNavigate();
  const { note } = useGetNotesQuery("notesList", {
    selectFromResult: ({ data }) => ({
      note: data?.entities[noteId],
    }),
  });

  const girisTarihi = new Date(note.girisTarihi).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  if (note) {
    return (
      <TableRow>
        <TableData>{note.getiren}</TableData>
        <TableData>{note.dorse}</TableData>
        <TableData className="hidden md:table-cell">{note.firma}</TableData>
        <TableData className="hidden md:table-cell">{note.mal}</TableData>
        <TableData>{note.gumrukBilgi}</TableData>
        <TableData>{girisTarihi}</TableData>
        <TableData className="hidden md:table-cell">
          {note.girisYapan}
        </TableData>
        {status === "Memur" && (
          <TableData className="p-0">
            <button
              onClick={() => navigate(`/dash/gumruk/${noteId}`)}
              className="w-full h-full"
            >
              <FontAwesomeIcon icon={faPersonMilitaryPointing} />
            </button>
          </TableData>
        )}
        {status == "Çalışan" && (
          <TableData>
            <button
              className="w-full h-full"
              onClick={() => navigate(`/dash/cikis/${noteId}`)}
            >
              <FontAwesomeIcon icon={faSignOut} />
            </button>
          </TableData>
        )}
        {(isAdmin || isManager) && (
          <TableData>
            <DropdownMenu noteId={noteId} />
          </TableData>
        )}
      </TableRow>
    );
  }
  return null;
};

Note.propTypes = {
  noteId: PropTypes.string.isRequired,
};

export default NotesList;
