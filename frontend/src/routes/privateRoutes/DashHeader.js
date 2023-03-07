import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faFileCirclePlus,
    faFilePen,
    faUserGear,
    faUserPlus,
    faRightFromBracket,
    faScroll,
} from "@fortawesome/free-solid-svg-icons"
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useSendLogoutMutation } from '../../app/api/authApiSlice'
import useAuth from '../../hooks/useAuth'
import PulseLoader from 'react-spinners/PulseLoader'



//const DASH_REGEX = /^\/dash(\/)?$/
const NOTES_REGEX = /^\/dash\/notes(\/)?$/
const USERS_REGEX = /^\/dash\/users(\/)?$/
const RAPOR_REGEX = /^\/dash\/rapor(\/)?$/

const DashHeader = () => {
    const { isManager, isAdmin, status } = useAuth()
    

    const navigate = useNavigate()
    const { pathname } = useLocation()

    const [sendLogout, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useSendLogoutMutation()

    useEffect(() => {
        if (isSuccess) navigate('/')
    }, [isSuccess, navigate])

    const onNewNoteClicked = () => navigate('/dash/notes/new')
    const onNewUserClicked = () => navigate('/dash/users/new')
    const onNotesClicked = () => navigate('/dash/notes')
    const onUsersClicked = () => navigate('/dash/users')
    const onRaporClicked = () => navigate('/dash/rapor')
    

    /* let dashClass = null
    if (!DASH_REGEX.test(pathname) && !NOTES_REGEX.test(pathname) && !USERS_REGEX.test(pathname)) {
        dashClass = "dash-header__container--small"
    } */

    let newNoteButton = null
    if (status !== "Memur") {
        if (NOTES_REGEX.test(pathname)) {
            newNoteButton = (
                <button
                    className="icon-button"
                    title="Yeni Kayıt"
                    onClick={onNewNoteClicked}
                >
                    <FontAwesomeIcon icon={faFileCirclePlus} />
                </button>
            )
        }
    }

    let newUserButton = null
    if (USERS_REGEX.test(pathname)) {
        newUserButton = (
            <button
                className="icon-button"
                title="Yeni Kullanıcı"
                onClick={onNewUserClicked}
            >
                <FontAwesomeIcon icon={faUserPlus} />
            </button>
        )
    }

    let userButton = null
    if (isManager || isAdmin) {
        if (!USERS_REGEX.test(pathname) && pathname.includes('/dash')) {
            userButton = (
                <button
                    className="icon-button"
                    title="Kullanıcılar"
                    onClick={onUsersClicked}
                >
                    <FontAwesomeIcon icon={faUserGear} />
                </button>
            )
        }
    }
    

    let notesButton = null
    if (status !== "Memur") {
    if (!NOTES_REGEX.test(pathname) && pathname.includes('/dash')) {
        notesButton = (
            <button
                className="icon-button"
                title="Kayıtlar"
                onClick={onNotesClicked}
            >
                <FontAwesomeIcon icon={faFilePen} />
            </button>
        )
    }
}

    let raporButton = null
    if (status !== "Memur") {
    if (!RAPOR_REGEX.test(pathname) && pathname.includes('/dash')) {
        raporButton = (
            <button
                className="icon-button"
                title="Rapor"
                onClick={onRaporClicked}
            >
                <FontAwesomeIcon icon={faScroll} />
            </button>
        )
    }
}

    const logoutButton = (
        <button
            className="icon-button"
            title="Çıkış"
            onClick={sendLogout}
        >
            <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
    )

    const errClass = isError ? "errmsg" : "offscreen"

    let buttonContent
    if (isLoading) {
        buttonContent = <PulseLoader color={"#FFF"} />
    } else {
        buttonContent = (
            <>
                {raporButton}
                {newNoteButton}
                {newUserButton}
                {notesButton}
                {userButton}
                {logoutButton}
            </>
        )
    }

    const content = (
        
            

            <header className="header">
                <div className="header__container"> 
                <p className={errClass}>{error?.data?.message}</p>                          
                    <Link to="/dash" className='logo__text'>
                        <h1 className="header__title">Gebze Konak Tır Parkı</h1>
                    </Link>
                    <nav className="header__nav">
                        {buttonContent}
                    </nav>
                </div>
            </header>
       
    )

    return content
}
export default DashHeader