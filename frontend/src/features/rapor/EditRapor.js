import {useState, useEffect} from "react"
import { useParams, useNavigate } from 'react-router-dom'
import { useGetRaporQuery, useUpdateRaporMutation } from '../../app/api/notesApiSlice'
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { selectCurrentPage } from "../../app/appStore/pageSlice"
import { useSelector} from 'react-redux'
import useAuth from '../../hooks/useAuth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'
import moment from 'moment'


const EditRapor = () => {
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
    const {username, isManager, isAdmin } = useAuth()
    const navigate = useNavigate()
    const [dorse, setDorse] = useState(note.dorse??"")
    const [getiren, setGetiren] = useState(note.getiren??"")
    const [goturen, setGoturen] = useState(note.goturen??"")
    const [firma, setFirma] = useState(note.firma??"")
    const [mal, setMal] = useState(note.mal??"")
    const [girisTarihi, setGirisTarihi] = useState(note.girisTarihi??"")
    const [cikisTarihi, setCikisTarihi] = useState(note.cikisTarihi??"")
    const [gumrukBilgi, setgumrukBilgi] = useState(note.gumrukBilgi)
    const [gumrukBilgiTarihi, setgumrukBilgiTarihi] = useState(note.gumrukBilgiTarihi??"")
 
    const [updateRapor, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useUpdateRaporMutation()

    const onDorseChanged = e => setDorse(e.target.value)
    const onGetirenChanged = e => setGetiren(e.target.value)
    const onGoturenChanged = e => setGoturen(e.target.value)
    const onFirmaChanged = e => setFirma(e.target.value)
    const onMalChanged = e => setMal(e.target.value)
    const onGirisTarihiChanged = e => setGirisTarihi(e.target.value)
    const onCikisTarihiChanged = e => setCikisTarihi(e.target.value)
    const ongumrukBilgiChanged = e => setgumrukBilgi(e.target.value)
    const ongumrukBilgiTarihiChanged = e => setgumrukBilgiTarihi(e.target.value)

    const onSaveRaporClicked = async () => {        
            await updateRapor({ id: note.id, user: username, dorse, getiren, goturen, firma, mal, girisTarihi, cikisTarihi, gumrukBilgi, gumrukBilgiTarihi, guncellemeTarihi: Date.now()})
        }

    useEffect(() => {
            if (isSuccess) {
                navigate('/dash/rapor')
            }
    
        }, [isSuccess, navigate])

    /* let content    

    if(isLoading) content = <p>Yükleniyor</p>
    
    if (isError) {
        content = <p className="errmsg">{error?.data?.message}</p>
    } */

    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">           
            <div className="form__title-row">            
                <h2 className='subtitle1'>Araç Bilgi Düzenle</h2>
                {(isAdmin || isManager) && <div className="form__action-buttons-wrapper">
                    <div className="form__action-buttons">
                        <button
                            className="form__button success__button"
                            title="Kaydet"
                            onClick={onSaveRaporClicked}
                        >
                            <FontAwesomeIcon icon={faSave} />
                        </button>
                    </div>
                </div>}                                    
            </div>
            
            <form className="form" onSubmit={e => e.preventDefault()}>                               
                <label className="form__label" htmlFor="dorse">
                    Dorse Plakası:</label>
                <input
                    className={`form__input form__input--text`}
                    id="dorse"
                    name="dorse"
                    type= "text"
                    onChange={onDorseChanged}
                    value={dorse}
                />
                <label className="form__label" htmlFor="getiren">
                    Getiren Çekici Plakası:</label>
                <input
                    className={`form__input `}
                    id="getiren"
                    name="getiren"
                    type="text"
                    onChange={onGetirenChanged}
                    value={getiren}
                />
                <label className="form__label" htmlFor="goturen">
                    Götüren Çekici Plakası:</label>
                <input
                    className={`form__input form__input--text`}
                    id="goturen"
                    name="goturen"
                    type= "text"
                    onChange={onGoturenChanged}
                    value={goturen}
                />
                <label className="form__label" htmlFor="firma">
                    Firma:</label>
                <input
                    className={`form__input form__input--text`}
                    id="firma"
                    name="firma"
                    type= "text"
                    onChange={onFirmaChanged}
                    value={firma}
                />
                <label className="form__label" htmlFor="mal">
                    Malın cinsi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="mal"
                    name="mal"
                    type= "text"
                    onChange={onMalChanged}
                    value={mal}
                />         
                <label className="form__label" htmlFor="girisTarihi">
                    Giriş Tarihi:</label>
                <input
                    className={`form__input `}
                    id="girisTarihi"
                    name="girisTarihi"
                    type="datetime-local"
                    onChange={onGirisTarihiChanged}
                    value={moment(girisTarihi).format('YYYY-MM-DDTHH:mm')}
                />
                <label className="form__label" htmlFor="ct">
                    Çıkış Tarihi:</label>    
                <input
                    className={`form__input form__input--text`}
                    id="ct"
                    name="ct"
                    type= "datetime-local"                    
                    onChange={onCikisTarihiChanged}
                    value={moment(cikisTarihi).format('YYYY-MM-DDTHH:mm')}
                />
                <label className="form__label" htmlFor="gumrukBilgi">
                    Gümrük Bilgi:</label>
                <textarea
                    className={`form__input form__input--text`}
                    id="gumrukBilgi"
                    name="gumrukBilgi"
                    type= "text"
                    onChange={ongumrukBilgiChanged}
                    value={gumrukBilgi}
                /> 
                <label className="form__label" htmlFor="gumrukBilgi">
                    Gümrük Giriş Tarihi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumrukBilgi"
                    name="gumrukBilgi"
                    type= "datetime-local"
                    onChange={ongumrukBilgiTarihiChanged}
                    value={moment(gumrukBilgiTarihi).format('YYYY-MM-DDTHH:mm')}
                />
            </form> 
        </div>
        </div>
    )


    return content
}



export default EditRapor