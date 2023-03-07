import {useState} from "react"
import { useGetRaporQuery } from "../../app/api/notesApiSlice"
import useTitle from "../../hooks/useTitle"
import PulseLoader from 'react-spinners/PulseLoader'
import SearchBar from "../../components/SearchBar/SearchBar"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesLeft, faAnglesRight } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from 'react-redux'
import { setPage } from '../../app/appStore/pageSlice'
import { selectCurrentPage } from "../../app/appStore/pageSlice"


const Rapor = () => {
    useTitle('Kayıt Listesi')
    
    /* const { isManager, isAdmin, status } = useAuth() */
    const page = useSelector(selectCurrentPage)
    const dispatch = useDispatch()
    console.log(page)
    /* const { username, isManager, isAdmin } = useAuth() */
    const [search, setSearch] = useState("")

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
        const { ids, entities } = data.notes
        console.log(ids)
        console.log(entities)
        //entities.sort((a,b) => a.cikisTarihi === b.cikisTarihi ? 0 : a.cikisTarihi ? 1 : -1)
        let count = data?.pagination.count
        let pageCount= data?.pagination.pageCount
        console.log(count)
        console.log(pageCount)
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
            <table className="table table_rapor">
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


    const { note   } = useGetRaporQuery(page, {
        selectFromResult: ({ data }) => ({
            note: data?.notes.entities[noteId]
        }),
    })

    const navigate = useNavigate()
    
    
    

    if (note) {

        const handleDetail = () => navigate(`/dash/rapor/${noteId}`)

        let options = {
            dateStyle: "short",
            timeStyle: "short",  
        }
        const created = new Date(note.createdAt).toLocaleString('tr-TR', options)

        const cikisTarihi =note.cikisTarihi === undefined ? "" : new Date(note.cikisTarihi).toLocaleString('tr-TR', options)

        const kaldigiGun =note.cikisTarihi === undefined ? "" : Math.ceil( (new Date(note.cikisTarihi).getTime() - new Date(note.createdAt).getTime())/(1000 * 3600 * 24))

        return (
            <tr className="table__row">
                <td className="table__cell ">{note.dorse}</td>
                <td className="table__cell mobile">{note.getiren}</td>
                <td className="table__cell ">{note.goturen}</td>
                <td className="table__cell  mobile">{note.firma}</td>
                <td className="table__cell mobile">{note.mal}</td>
                <td className="table__cell mobile">{note.gumruk}</td>
                <td className="table__cell mobile">{created}</td>
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
            </tr>
        )

    } else return null
}




export default Rapor