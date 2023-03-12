import useTitle from '../../hooks/useTitle'
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import useAuth from '../../hooks/useAuth'
import { useAddNewNoteMutation } from "../../app/api/notesApiSlice"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from "@fortawesome/free-solid-svg-icons"

const NewNote = () => {
    useTitle('Yeni Park Girişi')   


    const content = <NewNoteForm />

    return content
}



const NewNoteForm = () => {

    const { username} = useAuth()

    const [addNewNote, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useAddNewNoteMutation()
    const navigate = useNavigate()
    const [getiren, setGetiren] = useState('')
    const [dorse, setDorse] = useState('')
    const [firma, setFirma] = useState('')
    const [mal, setMal] = useState('')
    
    useEffect(() => {
        if (isSuccess) {
            setGetiren('')
            setDorse('')
            setFirma('')
            setMal('')
            navigate('/dash/notes')
        }
    }, [isSuccess, navigate])

    const onGetirenChanged = e => setGetiren(e.target.value)
    const onDorseChanged = e => setDorse(e.target.value)
    const onFirmaChanged = e => setFirma(e.target.value)
    const onMalChanged = e => setMal(e.target.value)
    const canSave = [getiren, dorse].every(Boolean) && !isLoading
    const onSaveNoteClicked = async (e) => {
        e.preventDefault()
        if (canSave) {
            await addNewNote({ user: username, getiren, dorse, firma, mal, girisTarihi: Date.now() })
        }
    }
    const errClass = isError ? "errmsg" : "offscreen"
    const validGetirenClass = !getiren ? "form__input--incomplete" : ''
    const validDorseClass = !dorse ? "form__input--incomplete" : ''
    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            <p className={errClass}>{error?.data?.message}</p>
            <div className="form__title-row">
            <h2>Yeni Park Girişi</h2>
                    <div className="form__action-buttons-wrapper">
                    <div className="form__action-buttons">
                        <button
                            className="form__button success__button"
                            title="Kaydet"
                            onClick={onSaveNoteClicked}
                            disabled={!canSave}
                        >
                            <FontAwesomeIcon icon={faSave} />
                        </button>
                    </div>
                    </div>
                    
            </div>
            <form className="form" onSubmit={onSaveNoteClicked} autoComplete= "off">
                <input
                    className={`form__input ${validGetirenClass}`}
                    id="getiren"
                    name="getiren"
                    type="text"
                    autoComplete="off"
                    value={getiren}
                    placeholder="Getiren Çekici Plakası"
                    onChange={onGetirenChanged}
                    autoFocus
                />
                <input
                    className={`form__input form__input--text ${validDorseClass}`}
                    id="dorse"
                    name="dorse"
                    type="text"
                    autoComplete="off"
                    value={dorse}
                    placeholder="Dorse Plakası"
                    onChange={onDorseChanged}
                />
                <input
                    className={`form__input form__input--text`}
                    id="firma"
                    name="firma"
                    type="text"
                    autoComplete="off"
                    value={firma}
                    placeholder="Firma"
                    onChange={onFirmaChanged}
                />
                <input
                    className={`form__input form__input--text `}
                    id="mal"
                    name="mal"
                    type="text"
                    autoComplete="off"
                    value={mal}
                    placeholder="Malın Cinsi"
                    onChange={onMalChanged}
                />
            </form>
        </div>
        </div>
    )
    return content
}

export default NewNote