import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import classes from "./searchBar.module.scss"

const SearchBar = ({setSearch}) => {
  return (    
            <form className={classes.search} >
                <input
                    className={classes.search__input}
                    type="text"
                    id="search"
                    placeholder='Çekici, Dorse, Firma Ara...'
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button className={classes.search__button} disabled>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            </form>
        
  )
}

export default SearchBar