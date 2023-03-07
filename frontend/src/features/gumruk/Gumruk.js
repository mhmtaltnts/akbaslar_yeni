import { useParams } from 'react-router-dom'
import { useGetNotesQuery } from '../../app/api/notesApiSlice'
/* import useAuth from '../../hooks/useAuth' */
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { useState, useEffect } from "react"
import { useGumrukMutation } from "../../app/api/notesApiSlice"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave} from "@fortawesome/free-solid-svg-icons"
import useAuth from "../../hooks/useAuth"

const EditGumruk = () => {
    useTitle('Gümrük Girişi')

    const { id } = useParams()

    /* const { username, isManager, isAdmin } = useAuth() */

    const { note } = useGetNotesQuery("notesList", {
        selectFromResult: ({ data }) => ({
            note: data?.entities[id]
        }),
    })

    

    if (!note) return <PulseLoader color={"#FFF"} />


    /* if (!isManager && !isAdmin) {
        if (note.username !== username) {
            return <p className="errmsg">No access</p>
        }
    } */

    const content = <EditGumrukForm note={note} />

    return content
}



const EditGumrukForm = ({ note }) => {

    const { username} = useAuth()

    const [cikisNote, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useGumrukMutation()


    const navigate = useNavigate()

    const [gumruk, setGumruk] = useState(note.gumruk)
    

    useEffect(() => {

        if (isSuccess ) {
            setGumruk('')            
            navigate('/dash/notes')
        }

    }, [isSuccess, navigate])

    const onGumrukChanged = e => setGumruk(e.target.value)
    

    const canSave = [gumruk].every(Boolean) && !isLoading

    const onSaveNoteClicked = async (e) => {
        if (canSave) {
            await cikisNote({ id: note.id, user: username, gumruk})
        }
    }

    

    const errClass = (isError ) ? "errmsg" : "offscreen"
    const validGumrukClass = !gumruk ? "form__input--incomplete" : ''
    

    const errContent = (error?.data?.message) ?? ''
    
    let options = {
        dateStyle: "short",
        timeStyle: "short",
    }
    const created = new Date(note.createdAt).toLocaleString('tr-TR', options)


    
    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            <p className={errClass}>{errContent}</p>
            <div className="form__title-row">
            <h2>Gümrük Veri Girişi</h2>                
                <div className="form__action-buttons-wrapper">
                    <div className="form__action-buttons">
                        <button
                            className="form__button success__button"
                            title="Save"
                            onClick={onSaveNoteClicked}
                            disabled={!canSave}
                        >
                            <FontAwesomeIcon icon={faSave} />
                        </button>
                    </div>
                </div>
                
            </div>

            <form className="form" onSubmit={e => e.preventDefault()}>
                 <label htmlFor="gumruk">Gümrük Kaydı</label>               
                <textarea
                    className={`form__input ${validGumrukClass}`}
                    id="gumruk"
                    name="gumruk"
                    type="text"
                    autoComplete="off"
                    placeholder="Gümrük bilgilerini yazınız"
                    value={gumruk}
                    onChange={onGumrukChanged}
                    autoFocus
                />
                <label htmlFor="dorse">Dorse Plakası</label>
                <input
                    className={`form__input`}
                    id="dorse"
                    name="dorse"
                    type="text"
                    value={note.dorse}
                    disabled
                />
                <label htmlFor="getiren">Getiren Çekici</label>
                <input
                    className={`form__input`}
                    id="getiren"
                    name="getiren"
                    type="text"
                    value={note.getiren}
                    disabled
                />
                <label htmlFor="firma">Firma</label>
                <input
                    className={`form__input`}
                    id="firma"
                    name="firma"
                    type="text"
                    value={note.firma}
                    disabled
                />
                <label htmlFor="firma">Giriş Tarihi</label>
                <input
                    className={`form__input`}
                    id="gelisTarihi"
                    name="gelisTarihi"
                    type="text"
                    value={created}
                    disabled
                />
                               
            </form>
        </div>
        </div>
    )

    return content
}



export default EditGumruk