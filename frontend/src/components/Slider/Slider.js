import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChevronLeft,
    faChevronRight
} from "@fortawesome/free-solid-svg-icons"

import classes from "./slider.module.scss"




const Slider = () => {
    const [slide, setSlide] = useState(0)

    const preSlide = () => {        
        setSlide(slide === 0 ? 4 : (pre) => pre - 1 )
        
    }
    const nextSlide = () => {
        setSlide(slide === 4 ? 0 : (pre) => pre + 1 )
    }

    const data = [
        "img/konak-park-1.jpg",
        "img/konak-park-2.jpg",
        "img/konak-park-3.jpg",
        "img/konak-park-4.jpg",
        "img/konak-park-5.jpg",
    ]
  return (
    <div className={classes.slider}>
        <h1 className={classes.public__title}>Hoşgeldiniz</h1>
        <div className={classes.slider__container}>
            <img className={classes.slider_img} src={data[slide]} alt="slider" />            
        </div>
        <div className={classes.icons__container}>
            <div className={classes.icons}>
                <div className={classes.icon} onClick={preSlide}>
                    <FontAwesomeIcon icon={faChevronLeft} size="xs" />
                </div>
                <div className={classes.icon} onClick={nextSlide} >
                    <FontAwesomeIcon icon={faChevronRight} size="xs" />
                </div>
            </div>
        </div>
    </div>
  )
}

export default Slider