import {useState} from "react";
import { useGetNotesQuery } from "../../app/api/notesApiSlice"
import useTitle from "../../hooks/useTitle"
import PulseLoader from 'react-spinners/PulseLoader'
import SearchBar from "../../components/SearchBar/SearchBar"
/* import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons" */



const PublicNotesList = () => {
    useTitle('Kayıtları Listele');  

    const [search, setSearch] = useState("")


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
        if(!search){
            filteredIds = [...ids]
        } else{
            filteredIds = ids.filter(noteId => { return (entities[noteId].dorse !== undefined && entities[noteId].dorse.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].getiren !== undefined && entities[noteId].getiren.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].firma !== undefined && entities[noteId].firma.toLowerCase().includes(search.toLowerCase()))})

        }
               

        const tableContent = ids?.length && filteredIds.map(noteId => <PublicNote key={noteId} noteId={noteId} />)
    
        content = (<div className='wrapper'>
        
        <div className="search-count">
            <SearchBar setSearch={setSearch}/>
        </div>
            <h1>Parkta Mevcut Araçlar</h1>

            <table className="table table-public_notes">
                <thead className="table__thead">
                    <tr>
                        <th scope="col" className="" >Getiren Çekici</th>
                        <th scope="col" >Dorse Plakası</th>
                        <th scope="col" className="mobile">Firma</th>
                        <th scope="col" className="">Giriş Tarihi</th>
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



const PublicNote = ({ noteId }) => {

    const { note } = useGetNotesQuery("notesList", {
        selectFromResult: ({ data }) => ({
            note: data?.entities[noteId]
        }),
    })

    let options = {
        dateStyle: "short",
        timeStyle: "short",
    }

    /* const yonClass = isAdmin || isManager ? "yonetici" : ""; */
    const girisTarihi = new Date(note.girisTarihi).toLocaleString('tr-TR', options)
    if (note) {
        
        return (
            <tr className="table__row">
                <td className="table__cell mobile">{note.getiren}</td>
                <td className="table__cell">{note.dorse}</td>
                <td className="table__cell tablet">{note.firma}</td>
                <td className="table__cell tablet">{girisTarihi}</td>
            </tr>
        )

    } else return null
}


export default PublicNotesList