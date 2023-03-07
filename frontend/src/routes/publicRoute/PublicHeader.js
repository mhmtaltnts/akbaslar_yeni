import React from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { setTheme } from '../../app/appStore/themeSlice'
import { selectCurrentTheme } from "../../app/appStore/themeSlice"
import { useDispatch, useSelector } from 'react-redux'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

import {
    faRightToBracket,
    faSun,
    faMoon,
} from "@fortawesome/free-solid-svg-icons"

const ARACLAR_REGEX = /^\/araclar?$/

const PublicHeader = () => {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const dark = useSelector(selectCurrentTheme)
    const onSystemGoClicked = () => navigate("/login")
    const onNotesClicked = () => navigate('/araclar')
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



    return (
        <>
            <header className='header'>
                <div className='header__container'>


                    <Link to="/" className='logo__text' >
                        <h1 className="header__title">Gebze Konak Tır Parkı</h1>
                    </Link>

                    <div className='header__nav'>
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
                        {!ARACLAR_REGEX.test(pathname) && <button
                            className="icon-button"
                            title="Kayıtlar"
                            onClick={onNotesClicked}
                        >
                            Misafir Araçlar
                        </button>}
                        <button
                            className="icon-button"
                            title="Yeni Kayıt"
                            onClick={onSystemGoClicked}
                        >
                            <FontAwesomeIcon icon={faRightToBracket} />
                        </button>

                    </div>

                </div>
            </header>
        </>

    )
}

export default PublicHeader