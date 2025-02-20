import { useState } from "react";
import {
  useGetRaporQuery,
  useDeleteNoteMutation,
} from "../../api/notesApiSlice";
import useTitle from "../../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import SearchBar from "../../components/SearchBar/SearchBar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight,
  faCaretDown,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setPage } from "../../appStore/pageSlice";
import { selectCurrentPage } from "../../appStore/pageSlice";
import useAuth from "../../utils/hooks/useAuth";
import PropTypes from "prop-types";
import { calculateDaysBetweenDates } from "../../utils/libs";
import {
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";

import DropdownMenu from "@/components/dropdown-rapor";
import Button from "@/components/button";

const Rapor = () => {
  useTitle("Kayıt Listesi");
  const page = useSelector(selectCurrentPage);
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const { isManager, isAdmin, status } = useAuth();

  const { data, isLoading, isSuccess, isError, error } = useGetRaporQuery(page);

  let content;

  if (isLoading) content = <PulseLoader color={"#827d7d"} />;

  if (isError) {
    content = (
      <p className="text-red-500 dark:text-red-400 text-sm">
        {error?.data?.message}
      </p>
    );
  }

  if (isSuccess && data?.notes) {
    let filteredIds;
    const { ids, entities } = data.notes;
    let count = data?.pagination.count;
    let pageCount = data?.pagination.pageCount;

    if (!search) {
      filteredIds = [...ids];
    } else {
      filteredIds = ids.filter((noteId) => {
        return (
          (entities[noteId].dorse !== undefined &&
            entities[noteId].dorse
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].getiren !== undefined &&
            entities[noteId].getiren
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].goturen !== undefined &&
            entities[noteId].goturen
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].firma !== undefined &&
            entities[noteId].firma
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].mal !== undefined &&
            entities[noteId].mal
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].gumrukBilgi !== undefined &&
            entities[noteId].gumrukBilgi
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (entities[noteId].kaldigiGun !== undefined &&
            entities[noteId].kaldigiGun
              .toLowerCase()
              .includes(search.toLowerCase()))
        );
      });
    }

    const handlePrevious = () => {
      let sayfa = page;
      if (sayfa === 1) {
        dispatch(setPage({ sayfa }));
      }
      sayfa = sayfa - 1;
      dispatch(setPage({ sayfa }));
    };

    const handleNext = () => {
      let sayfa = page;
      if (sayfa === 1) {
        dispatch(setPage({ sayfa }));
      }
      sayfa = sayfa + 1;
      dispatch(setPage({ sayfa }));
    };

    const tableContent =
      ids?.length &&
      filteredIds.map((noteId) => (
        <RaporNote key={noteId} noteId={noteId} page={page} />
      ));

    content = (
      <div className="flex flex-col items-center justify-center p-2 w-full max-w-[99%] mt-6 ">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full mb-4">
          <SearchBar setSearch={setSearch} />
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold dark:text-black bg-sari rounded-full p-1">
              {count}
            </h2>
            <button
              disabled={page === 1}
              onClick={() => dispatch(setPage({ sayfa: 1 }))}
              className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faAnglesLeft} />
            </button>
            <button
              disabled={page === 1}
              onClick={handlePrevious}
              className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            <p className="text-gray-700 dark:text-gray-300">
              {page}/{pageCount}
            </p>
            <button
              disabled={page === pageCount}
              onClick={handleNext}
              className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
            <button
              disabled={page === pageCount}
              onClick={() => dispatch(setPage({ sayfa: pageCount }))}
              className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faAnglesRight} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full max-w-screen">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Dorse</TableHeader>
                <TableHeader>Getiren Çekici</TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Götüren Çekici
                </TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Firma
                </TableHeader>
                <TableHeader className="hidden md:table-cell">Yükü</TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Gümrük
                </TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Giriş Tarihi
                </TableHeader>
                <TableHeader>Çıkış Tarihi</TableHeader>
                <TableHeader className="hidden md:table-cell">Gün</TableHeader>
                {status === "Çalışan" && <TableHeader>Detay</TableHeader>}
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

const RaporNote = ({ noteId, page }) => {
  const { isManager, isAdmin, status } = useAuth();
  const { note } = useGetRaporQuery(page, {
    selectFromResult: ({ data }) => ({
      note: data?.notes.entities[noteId],
    }),
  });

  const navigate = useNavigate();
  const [deleteNote] = useDeleteNoteMutation();

  const onDeleteNoteClicked = async () => {
    if (
      window.confirm(`${note.dorse} Silmek istediğinizden emin misiniz?`) ===
      true
    ) {
      await deleteNote({ id: noteId });
    } else return;
  };

  if (note) {
    const handleDetail = () => navigate(`/dash/rapor/detail/${noteId}`);
    const handleEdit = () => navigate(`/dash/rapor/edit/${noteId}`);

    let options = {
      dateStyle: "short",
      timeStyle: "short",
    };
    const girisTarihi = new Date(note.girisTarihi).toLocaleString(
      "tr-TR",
      options
    );

    const cikisTarihi =
      note.cikisTarihi === undefined
        ? ""
        : new Date(note.cikisTarihi).toLocaleString("tr-TR", options);

    const kaldigiGun =
      note.cikisTarihi === undefined
        ? ""
        : calculateDaysBetweenDates(
            new Date(note.cikisTarihi).getTime(),
            new Date(note.girisTarihi).getTime()
          );

    return (
      <TableRow>
        <TableData>{note.dorse}</TableData>
        <TableData>{note.getiren}</TableData>
        <TableData className="hidden md:table-cell">{note.goturen}</TableData>
        <TableData className="hidden md:table-cell">{note.firma}</TableData>
        <TableData className="hidden md:table-cell">{note.mal}</TableData>
        <TableData className="hidden md:table-cell">
          {note.gumrukBilgi}
        </TableData>
        <TableData className="hidden md:table-cell">{girisTarihi}</TableData>
        <TableData>{cikisTarihi}</TableData>
        <TableData className="hidden md:table-cell">{kaldigiGun}</TableData>
        {status == "Çalışan" && (
          <TableData>
            <Button variant="warning" onClick={handleDetail}>
              <FontAwesomeIcon icon={faCaretDown} />
            </Button>
          </TableData>
        )}
        {(isAdmin || isManager) && (
          <TableData>
            <DropdownMenu
              handleDelete={onDeleteNoteClicked}
              handleDetail={handleDetail}
              handleEdit={handleEdit}
            />
          </TableData>
        )}
      </TableRow>
    );
  } else return null;
};

RaporNote.propTypes = {
  noteId: PropTypes.string.isRequired,
  page: PropTypes.number.isRequired,
};

export default Rapor;
