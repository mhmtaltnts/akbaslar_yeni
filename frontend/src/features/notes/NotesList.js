import { useState } from "react";
import { useGetNotesQuery } from "../../app/api/notesApiSlice"
import useTitle from "../../hooks/useTitle"
import PulseLoader from 'react-spinners/PulseLoader'
import SearchBar from "../../components/SearchBar/SearchBar"
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
/* import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons" */


const NotesList = () => {
    useTitle('Kayıtları Listele');

    const { isManager, isAdmin, status } = useAuth()

    const [search, setSearch] = useState("")

    const calClass = (isAdmin || isManager) ? "table-yonetici" : (status === "Memur") ? "table-memur" : "table-calisan";

    const {
        data: notes,
        isLoading,
        isSuccess,
        isError,
        error
    } = useGetNotesQuery('notesList', {
        pollingInterval: 15000,
        refetchOnFocus: true,
        refetchOnMountOrArgChange: true
    })

    let content

    if (isLoading) content = <PulseLoader color={"#FFF"} />

    if (isError) {
        content = <p className="errmsg">{error?.data?.message}</p>
    }

    if (isSuccess) {
        let filteredIds
        const { ids, entities } = notes
        let count = ids.length
        if (!search) {
            filteredIds = [...ids]
        } else {
            filteredIds = ids.filter(noteId => { return (entities[noteId].dorse !== undefined && entities[noteId].dorse.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].getiren !== undefined && entities[noteId].getiren.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].firma !== undefined && entities[noteId].firma.toLowerCase().includes(search.toLowerCase())) })

        }


        const tableContent = ids?.length && filteredIds.map(noteId => <Note key={noteId} noteId={noteId} />)

        content = (
        <div className='wrapper'>
            <div className="search-count">
                <h2 className="subtitle1">Parkta mevcut araç sayısı: {count}</h2>
                <SearchBar setSearch={setSearch} />
            </div>

            <table className={`table ${calClass}`}>
                <thead className="table__thead">
                    <tr>
                        <th scope="col" >Getiren Çekici</th>
                        <th scope="col" >Dorse Plakası</th>
                        <th scope="col" className="mobile">Firma</th>
                        <th scope="col" className="mobile">Malın Cinsi</th>
                        <th scope="col" className="mobile">Gümrük Bilgi</th>
                        <th scope="col" className="mobile">Giriş Tarihi</th>
                        <th scope="col" className="mobile">Giriş Yapan</th>
                        {(status !== "Çalışan") && <th scope="col" className="">   </th>}
                        { (status !== "Memur") && <th scope="col" className="">   </th>}
                        {(isAdmin || isManager) && <th scope="col" className="mobile">  </th>}
                    </tr>
                </thead>
                <tbody>
                    {tableContent}
                </tbody>
            </table>
        </div>
        )

    }
    return content
}



const Note = ({ noteId }) => {
    const { isManager, isAdmin, status } = useAuth()

    const { note } = useGetNotesQuery("notesList", {
        selectFromResult: ({ data }) => ({
            note: data?.entities[noteId]
        }),
    })

    let options = {
        dateStyle: "short",
        timeStyle: "short",
    }

    const navigate = useNavigate()
    /* const yonClass = isAdmin || isManager ? "yonetici" : ""; */
    const girisTarihi = new Date(note.girisTarihi).toLocaleString('tr-TR', options)
    if (note) {
        const handleEdit = () => navigate(`/dash/notes/${noteId}`)
        const handleCikis = () => navigate(`/dash/cikis/${noteId}`)
        const handleGumruk = () => navigate(`/dash/gumruk/${noteId}`)

        return (
            <tr className="table__row">
                <td className="table__cell">{note.getiren}</td>
                <td className="table__cell">{note.dorse}</td>
                <td className="table__cell mobile">{note.firma}</td>
                <td className="table__cell mobile">{note.mal}</td>
                <td className="table__cell mobile">{note.gumrukBilgi}</td>
                <td className="table__cell mobile">{girisTarihi}</td>
                <td className="table__cell mobile">{note.girisYapan}</td>

                {(status !== "Çalışan") && <td className="table__cell table-th__button">
                    <button
                        className="button__success"
                        onClick={handleGumruk}
                    >
                        Gümrük
                    </button>
                </td>}

                {(status !== "Memur") && <td className="table__cell table-th__button">
                    <button
                        className="button__danger"
                        onClick={handleCikis}
                    >
                        ÇıkışYap
                    </button>
                </td>
                }

                {(isAdmin || isManager) && <td className="table__cell table-th__button mobile">
                    <button
                        className="button__warning"
                        onClick={handleEdit}
                    >
                        Değiştir
                    </button>
                </td>}
            </tr>
        )

    } else return null
}



export default NotesList