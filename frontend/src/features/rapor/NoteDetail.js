import { useParams} from 'react-router-dom'
import { useGetRaporQuery} from '../../app/api/notesApiSlice'
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { selectCurrentPage } from "../../app/appStore/pageSlice"
import { useSelector} from 'react-redux'
import moment from "moment"


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
    const content = <NoteForm note={note} />   
    return content
}

const NoteForm = ({ note }) => {
    
    let options = {
        dateStyle: "short",
        timeStyle: "short",
        
    }

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
                <label className="form__label" htmlFor="gumrukBilgi">
                    Gümrük Bilgi:</label>
                <textarea
                    className={`form__input form__input--text`}
                    id="gumrukBilgi"
                    name="gumrukBilgi"
                    type= "text"
                    autoComplete="off"
                    value={note.gumrukBilgi}
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
                    type="datetime-local"
                    autoComplete="off"
                    value={moment(note.girisTarihi).format('YYYY-MM-DDTHH:mm')}
                    disabled
                /> 
                <label className="form__label" htmlFor="gumrukBilgi">
                    Gümrük Giriş Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumrukBilgi"
                    name="gumrukBilgi"
                    type= "datetime-local"
                    autoComplete="off"
                    value={moment(note.gumrukBilgiTarihi).format('YYYY-MM-DDTHH:mm')}
                    disabled
                />
                <label className="form__label" htmlFor="ct">
                    Çıkış Tarihi:</label>    
                <input
                    className={`form__input form__input--text`}
                    id="ct"
                    name="ct"
                    type= "datetime-local"                    
                    value={moment(note.cikisTarihi).format('YYYY-MM-DDTHH:mm')}
                    disabled
                />
                <label className="form__label" htmlFor="gT">
                    Değiştirme Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gT"
                    name="gT"
                    type= "datetime-local"
                    autoComplete="off"
                    value={moment(note.guncellemeTarihi).format('YYYY-MM-DDTHH:mm')}
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
                <label className="form__label" htmlFor="gumrukBilgi">
                    Gümrük Girişi Yapan:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumrukBilgi"
                    name="gumrukBilgi"
                    type= "text"
                    autoComplete="off"
                    value={note.gumrukYapan}
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
                    value={note.guncellemeYapan}
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