import React from 'react'
import {  Link, useLocation } from 'react-router-dom'


const ARACLAR_REGEX = /^\/araclar?$/

const PublicFooter = () => {
    const { pathname } = useLocation()

    return (
        <footer className='footer'>

            <div className='footer-wrapper'>
                <address className="footer_left">
                <p><span style={{fontWeight: "700"}}>Adres:</span> Kirazlıpınar Mah. Yeni Bağdat Cd. No:791 PK:41400 Gebze/ Kocaeli</p>
                </address>
                <div className='footer_middle'>
                {!ARACLAR_REGEX.test(pathname) && <Link to="/araclar">Parkımızda misafir araçlara buradan ulaşabilirsiniz.</Link>}
                </div>
                <div className='footer_right'>
                  <a href="tel:+902627541406">Tel: +90 262 754 14 06</a>
                </div>
            </div>            

        </footer>
    )
}

export default PublicFooter  
