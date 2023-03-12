import {useState} from "react"
import { useGetRaporQuery, useDeleteNoteMutation } from "../../app/api/notesApiSlice"
import useTitle from "../../hooks/useTitle"
import PulseLoader from 'react-spinners/PulseLoader'
import SearchBar from "../../components/SearchBar/SearchBar"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesLeft, faAnglesRight, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from 'react-redux'
import { setPage } from '../../app/appStore/pageSlice'
import { selectCurrentPage } from "../../app/appStore/pageSlice"
import useAuth from '../../hooks/useAuth'
import moment from "moment"

const Rapor = () => {
    useTitle('Kayıt Listesi')
    const page = useSelector(selectCurrentPage)
    const dispatch = useDispatch()
    const [search, setSearch] = useState("")
    const { isManager, isAdmin} = useAuth()

    const {
        data,
        isLoading,
        isSuccess,
        isError,
        error
    } = useGetRaporQuery(page)
    
    
    
    //
    /* const calClass = (isAdmin || isManager) ? "table-yonetici" : (status === "Memur") ? "table-memur" : "table-calisan"; */
    let content

    if (isLoading) content = <PulseLoader color={"#FFF"} />

    if (isError) {
        content = <p className="errmsg">{error?.data?.message}</p>
    }

    if (isSuccess) {
        let filteredIds
        const { ids, entities } = data?.notes
        //entities.sort((a,b) => a.cikisTarihi === b.cikisTarihi ? 0 : a.cikisTarihi ? 1 : -1)
        let count = data?.pagination.count
        let pageCount= data?.pagination.pageCount
        //let count = 10
        if(!search){
            filteredIds = [...ids]
        } else{
            
            filteredIds = ids.filter(noteId => { return (entities[noteId].dorse !== undefined && entities[noteId].dorse.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].getiren !== undefined && entities[noteId].getiren.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].goturen !== undefined && entities[noteId].goturen.toLowerCase().includes(search.toLowerCase())) || (entities[noteId].firma !== undefined && entities[noteId].firma.toLowerCase().includes(search.toLowerCase()))})
        }

        const handlePrevious = () => {
            let sayfa = page             
            if(sayfa === 1){
                dispatch(setPage({sayfa})) 
            }
            sayfa = sayfa - 1   
            dispatch(setPage({sayfa}))
            
        
        }
        const handleNext = () => {
            let sayfa = page             
            if(sayfa === 1){
                dispatch(setPage({sayfa})) 
            }
            sayfa = sayfa + 1   
            dispatch(setPage({sayfa}))
            
        }

        const calClass = (isAdmin || isManager) ? "rapor-table-yonetici" : "rapor-table-calisan";
    
        const tableContent = ids?.length && filteredIds.map(noteId => <RaporNote key={noteId} noteId={noteId} page={page}/>)

        content = (<div className='wrapper'>
            <div className="search-count">
                <h2 className="subtitle1">Çıkışı Yapılmış Toplam Araç: {count}</h2>

                <div className="search-pagination">
                    <SearchBar setSearch={setSearch}/>
                    <div className="iteration">
                        <button disabled={page === 1} onClick={handlePrevious}><FontAwesomeIcon  icon={faAnglesLeft} /></button>
                        <p >{page}/{pageCount}</p>
                        <button disabled={page === pageCount} onClick={handleNext}><FontAwesomeIcon icon={faAnglesRight} /></button>
                    </div>
                </div>

            </div>
            <table className={`table ${calClass}`}>
                <thead className="table__thead">
                    <tr>
                        <th scope="col" className="table__th">Dorse Plakası</th>
                        <th scope="col" className="table__th mobile">Getiren Çekici</th>
                        <th scope="col" className="table__th">Götüren Çekici</th>
                        <th scope="col" className="table__th mobile">Firma</th>
                        <th scope="col" className="table__th mobile">Malın Cinsi</th>
                        <th scope="col" className="table__th mobile">Gümrük Kayıt</th>
                        <th scope="col" className="table__th mobile">Giriş Tarihi</th>
                        <th scope="col" className="table__th mobile">Çıkış Tarihi</th>
                        <th scope="col" className="table__th">Kaldığı Gün</th>
                        <th scope="col" className="table__th">Detay</th>
                        {(isManager || isAdmin) && <th scope="col" className="table__th mobile">Düzenle</th>}
                        {(isManager || isAdmin) && <th scope="col" className="table__th">Sil</th>}
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

//////////////////////////////////////////////////////////////

const RaporNote = ({ noteId, page }) => {
    const { isManager, isAdmin} = useAuth()
    const { note   } = useGetRaporQuery(page, {
        selectFromResult: ({ data }) => ({
            note: data?.notes.entities[noteId]
        }),
    })

    const navigate = useNavigate()
    
    const [deleteNote] = useDeleteNoteMutation()
    
    const onDeleteNoteClicked = async () => {
        await deleteNote({ id: noteId })
    }

    let deleteButton = null
        if (isManager || isAdmin) {
            deleteButton = (
                <button
                    className="form__button danger__button"
                    title="Sil"
                    onClick={onDeleteNoteClicked}
                >
                    <FontAwesomeIcon icon={faTrashCan} />
                </button>
            )
        }
    

    if (note) {

        const handleDetail = () => navigate(`/dash/rapor/detail/${noteId}`)
        const handleEdit = () => navigate(`/dash/rapor/edit/${noteId}`)

        let options = {
            dateStyle: "short",
            timeStyle: "short",  
        }
        const girisTarihi = new Date(note.girisTarihi).toLocaleString('tr-TR', options)

        const cikisTarihi =note.cikisTarihi === undefined ? "" : new Date(note.cikisTarihi).toLocaleString('tr-TR', options)

        const kaldigiGun =note.cikisTarihi === undefined ? "" : Math.ceil( (new Date(note.cikisTarihi).getTime() - new Date(note.girisTarihi).getTime())/(1000 * 3600 * 24))

        return (
            <tr className="table__row">
                <td className="table__cell ">{note.dorse}</td>
                <td className="table__cell mobile">{note.getiren}</td>
                <td className="table__cell ">{note.goturen}</td>
                <td className="table__cell  mobile">{note.firma}</td>
                <td className="table__cell mobile">{note.mal}</td>
                <td className="table__cell mobile">{note.gumrukBilgi}</td>
                <td className="table__cell mobile">{girisTarihi}</td>
                <td className="table__cell mobile">{cikisTarihi}</td>
                <td className="table__cell">{kaldigiGun}</td>
                <td className="table__cell table-th__button">
                    <button
                        className="button__warning"
                        onClick={handleDetail}
                    >
                        Detay
                    </button>
                </td>
                {(isAdmin || isManager) && <td className="table__cell table-th__button mobile">
                    <button
                        className="button__danger"
                        onClick={handleEdit}
                    >
                        Düzenle
                    </button>
                </td>}
                {(isManager || isAdmin) && <td className="table__cell">{deleteButton}</td>}
            </tr>
        )

    } else return null
}




export default Rapor