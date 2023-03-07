import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBars, faHouse,faSun, faMoon, } from "@fortawesome/free-solid-svg-icons"
import { useNavigate, useLocation } from 'react-router-dom'
import useAuth from "../../hooks/useAuth"
import { selectCurrentTheme } from "../../app/appStore/themeSlice"
import { useDispatch, useSelector } from 'react-redux'
import { setTheme } from '../../app/appStore/themeSlice'

const DashFooter = () => {

    const { fullName } = useAuth()
    const dispatch = useDispatch()
    const dark = useSelector(selectCurrentTheme)

    const navigate = useNavigate()
    const { pathname } = useLocation()

    /* const date = new Date()
    const today = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'long' }).format(date) */
    const onThemeClicked = () => {
        let darkness
        if(dark){
            darkness = false
        }else {
            darkness = true
        }
        console.log(darkness)
        dispatch(setTheme({darkness}))
    }
    

    let goHomeButton = null
    if (pathname !== '/dash') {
        const onGoHomeClicked = () => navigate('/dash')
        goHomeButton = (
            <button
                className="icon-button"
                title="Ana Panel"
                onClick={onGoHomeClicked}
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
        )
    }

    if (pathname === '/dash') {
        const onGoHomeClicked = () => navigate('/')
        goHomeButton = (
            <button
                className="icon-button"
                title="Ana Sayfa"
                onClick={onGoHomeClicked}
            >
                <FontAwesomeIcon icon={faHouse} />
            </button>
        )
    }

    const content = (
        <footer className="footer">
            <div className="footer-wrapper dash">
                <div className='footer_left'>
                    {goHomeButton}
                </div>
                <div className='footer_middle'>
                    <h2>Sağlıklı günler "{fullName}"</h2>
                </div>
                <div className='footer_right'>
                {dark ? 
                                (<button
                                    className="icon-button"
                                    title="Yeni Kayıt"
                                    onClick={onThemeClicked}
                                >
                                    <FontAwesomeIcon icon={faSun} />
                                </button>
                                )
                                    :
                                    (<button
                                        className="icon-button"
                                        title="Yeni Kayıt"
                                        onClick={onThemeClicked}
                                    >
                                        <FontAwesomeIcon icon={faMoon} />
                                    </button>
                                    )
                            }
                </div>
            </div>

            {/* <p>{today}</p> */}
        </footer>
    )
    return content
}
export default DashFooter