import { useParams } from 'react-router-dom'
import { useGetNotesQuery } from '../../app/api/notesApiSlice'
import useAuth from '../../hooks/useAuth'
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { useState, useEffect } from "react"
import { useUpdateNoteMutation, useDeleteNoteMutation } from "../../app/api/notesApiSlice"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faTrashCan } from "@fortawesome/free-solid-svg-icons"


const EditNote = () => {
    useTitle('Kayıt Düzenle')

    const { id } = useParams()

    const { username, isManager, isAdmin } = useAuth()

    const { note } = useGetNotesQuery("notesList", {
        selectFromResult: ({ data }) => ({
            note: data?.entities[id]
        }),
    })

    

    if (!note) return <PulseLoader color={"#FFF"} />


    if (!isManager && !isAdmin) {
        if (note.username !== username) {
            return <p className="errmsg">Erişim Engeli</p>
        }
    }

    const content = <EditNoteForm note={note} />
    

    return content
}



const EditNoteForm = ({ note }) => {

    const { username, isManager, isAdmin } = useAuth()

    const [updateNote, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useUpdateNoteMutation()

    const [deleteNote, {
        isSuccess: isDelSuccess,
        isError: isDelError,
        error: delerror
    }] = useDeleteNoteMutation()

    const navigate = useNavigate()

    const [getiren, setGetiren] = useState(note.getiren)
    const [dorse, setDorse] = useState(note.dorse)
    const [firma, setFirma] = useState(note.firma)
    const [mal, setMal] = useState(note.mal)
    const [gumruk, setGumruk] = useState(note.gumruk)
    

    useEffect(() => {

        if (isSuccess || isDelSuccess) {
            setGetiren('')
            setDorse('')
            setFirma('')
            setMal('')
            setGumruk('')
            navigate('/dash/notes')
        }

    }, [isSuccess, isDelSuccess, navigate])

    const onGetirenChanged = e => setGetiren(e.target.value)
    const onDorseChanged = e => setDorse(e.target.value)
    const onFirmaChanged = e => setFirma(e.target.value)
    const onMalChanged = e => setMal(e.target.value)
    const onGumrukChanged = e => setGumruk(e.target.value)
    

    const canSave = [getiren, dorse].every(Boolean) && !isLoading

    const onSaveNoteClicked = async (e) => {
        if (canSave) {
            await updateNote({ id: note.id, user: username, getiren, dorse, firma, mal, gumruk})
        }
    }

    const onDeleteNoteClicked = async () => {
        await deleteNote({ id: note.id })
    }


    const errClass = (isError || isDelError) ? "errmsg" : "offscreen"
    const validGetirenClass = !getiren ? "form__input--incomplete" : ''
    const validDorseClass = !dorse ? "form__input--incomplete" : ''
    
    

    const errContent = (error?.data?.message || delerror?.data?.message) ?? ''


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

    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            
            <p className={errClass}>{errContent}</p>
            <div className="form__title-row">
            <h2>Kayıt Düzenle</h2>
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
                        {deleteButton}
                    </div>
                </div>
                                    
            </div>

            <form className="form" onSubmit={e => e.preventDefault()} autoComplete="off">
                                 
                <label className="form__label" htmlFor="getiren">
                    Getiren Çekici Plakası:</label>
                <input
                    className={`form__input ${validGetirenClass}`}
                    id="getiren"
                    name="getiren"
                    type="text"
                    autoComplete="off"
                    value={getiren}
                    onChange={onGetirenChanged}
                    autoFocus
                />

                <label className="form__label" htmlFor="dorse">
                    Dorse Plakası:</label>
                <input
                    className={`form__input form__input--text ${validDorseClass}`}
                    id="dorse"
                    name="dorse"
                    type= "text"
                    autoComplete="off"
                    value={dorse}
                    onChange={onDorseChanged}
                />
                <label className="form__label" htmlFor="firma">
                    Firma:</label>
                <input
                    className={`form__input form__input--text`}
                    id="firma"
                    name="firma"
                    type= "text"
                    autoComplete="off"
                    value={firma}
                    onChange={onFirmaChanged}
                />
                <label className="form__label" htmlFor="mal">
                    Malın cinsi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="mal"
                    name="mal"
                    type= "text"
                    autoComplete="off"
                    value={mal}
                    onChange={onMalChanged}
                />
                <label className="form__label" htmlFor="gumruk">
                    Gümrük Bilgi:</label>
                <input
                    className={`form__input form__input--text`}
                    id="gumruk"
                    name="gumruk"
                    type= "text"
                    autoComplete="off"
                    value={gumruk}
                    onChange={onGumrukChanged}
                />
                                                
            </form> 
                      
        </div>
        </div>
    )

    return content
}



export default EditNote