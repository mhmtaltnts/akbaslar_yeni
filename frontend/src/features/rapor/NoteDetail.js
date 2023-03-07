import { useParams } from 'react-router-dom'
import { useGetRaporQuery } from '../../app/api/notesApiSlice'
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { selectCurrentPage } from "../../app/appStore/pageSlice"
import { useSelector} from 'react-redux'


const NoteDetail = () => {
    useTitle('Kayıt Düzenle')

    const { id } = useParams()
    const page = useSelector(selectCurrentPage)

    const {
        note
    } = useGetRaporQuery(page, {
        selectFromResult: ({ data }) => ({
            note: data?.notes.entities[id]
        }),
    })

    

    if (!note) return <PulseLoader color={"#FFF"} />


    const content = <EditNoteForm note={note} />
    

    return content
}



const EditNoteForm = ({ note }) => {

    let options = {
        dateStyle: "short",
        timeStyle: "short",  
    }
    const created = new Date(note.createdAt).toLocaleString('tr-TR', options)
    const degismeT = note.degismeTarihi === undefined ? "": new Date(note.degismeTarihi).toLocaleString('tr-TR', options)
    console.log(note.gumrukGirisTarihi)
    const gumrukDate = note.gumrukGirisTarihi === undefined ? "": new Date(note.gumrukGirisTarihi).toLocaleString('tr-TR', options)
    const cikisTarihi = new Date(note.cikisTarihi).toLocaleString('tr-TR', options)
    

    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            
           
            <div className="form__title-row">            
                <h2 className='subtitle1'>Araç Hakkında Detay</h2>                                    
            </div>

            <form className="form" onSubmit={e => e.preventDefault()}>
                
                               
                <label className="form__label" htmlFor="getiren">
                    Getiren Çekici Plakası:</label>
                <input
                    className={`form__input `}
                    id="getiren"
                    name="getiren"
                    type="text"
                    autoComplete="off"
                    value={note.getiren}
                    disabled
                />

                <label className="form__label" htmlFor="dorse">
                    Dorse Plakası:</label>
                <input
                    className={`form__input form__input--text`}
                    id="dorse"
                    name="dorse"
                    type= "text"
                    autoComplete="off"
                    value={note.dorse}
                    disabled
                />
                <label className="form__label" htmlFor="firma">
                    Firma:</label>
                <input
                    className={`form__input form__input--text`}
                    id="firma"
                    name="firma"
                    type= "text"
                    autoComplete="off"
                    value={note.firma}
                    disabled
                />
                <label className="form__label" htmlFor="mal">
                    Malın cinsi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="mal"
                    name="mal"
                    type= "text"
                    autoComplete="off"
                    value={note.mal}
                    disabled
                />
                <label className="form__label" htmlFor="gumruk">
                    Gümrük Bilgi:</label>
                <textarea
                    className={`form__input form__input--text`}
                    id="gumruk"
                    name="gumruk"
                    type= "text"
                    autoComplete="off"
                    value={note.gumruk}
                    disabled
                />
                             
                
                <label className="form__label" htmlFor="goturen">
                    Götüren Çekici Plakası:</label>
                <input
                    className={`form__input form__input--text`}
                    id="goturen"
                    name="goturen"
                    type= "text"
                    autoComplete="off"
                    value={note.goturen}
                    disabled
                />

                <label className="form__label" htmlFor="girisTarihi">
                    Giriş Tarihi:</label>
                <input
                    className={`form__input `}
                    id="girisTarihi"
                    name="girisTarihi"
                    type="text"
                    autoComplete="off"
                    value={created}
                    disabled
                /> 

                <label className="form__label" htmlFor="gumruk">
                    Gümrük Giriş Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumruk"
                    name="gumruk"
                    type= "text"
                    autoComplete="off"
                    value={gumrukDate}
                    disabled
                />
                
                <label className="form__label" htmlFor="ct">
                    Çıkış Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="ct"
                    name="ct"
                    type= "text"
                    autoComplete="off"
                    value={cikisTarihi}
                    disabled
                />

                
                <label className="form__label" htmlFor="gT">
                    Değiştirme Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gT"
                    name="gT"
                    type= "text"
                    autoComplete="off"
                    value={degismeT}
                    disabled
                />

                <label className="form__label" htmlFor="girisYapan">
                    Giriş Yapan:</label>
                <input
                    className={`form__input `}
                    id="girisYapan"
                    name="girisYapan"
                    type="text"
                    autoComplete="off"
                    value={note.girisYapan}
                    disabled
                />

                                
                <label className="form__label" htmlFor="gumruk">
                    Gümrük Girişi Yapan:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumruk"
                    name="gumruk"
                    type= "text"
                    autoComplete="off"
                    value={note.gumrukGirisiYapan}
                    disabled
                />
                <label className="form__label" htmlFor="guncelleme">
                    Değiştiren:</label>
                <input
                    className={`form__input form__input--text`}
                    id="guncelleme"
                    name="guncelleme"
                    type= "text"
                    autoComplete="off"
                    value={note.guncelleyen}
                    disabled
                /> 
                <label className="form__label" htmlFor="cy">
                    Çıkış Yapan:</label>
                <input
                    className={`form__input form__input--text`}
                    id="cy"
                    name="cy"
                    type= "text"
                    autoComplete="off"
                    value={note.cikisYapan}
                    disabled
                />
                                                
            </form> 
                      
        </div>
        </div>
    )

    return content
}



export default NoteDetail