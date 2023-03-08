import React from 'react'
import {  Link, useLocation } from 'react-router-dom'


const ARACLAR_REGEX = /^\/araclar?$/

const PublicFooter = () => {
    const { pathname } = useLocation()

    return (
        <footer className='footer'>

            <div className='footer-wrapper'>
                <address className="footer_left">
                <a href='http://maps.google.com/maps/place/Gebze+Konak+Tır+Parkı/@40.814112,29.4578733,17z/data=!3m1!4b1!4m6!3m5!1s0x14cb20d9dd4dd139:0x70a1165aa635b25e!8m2!3d40.814108!4d29.460062!16s%2Fg%2F11b7q2wk4h'><p><span style={{fontWeight: "700"}}>Adres:</span> Kirazlıpınar Mah. Yeni Bağdat Cd. No:791 PK:41400 Gebze/ Kocaeli</p></a>                
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
