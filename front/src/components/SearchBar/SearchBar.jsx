import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

const SearchBar = ({ setSearch }) => {
  return (
    <form className="flex items-center md:w-full md:max-w-xl">
      <input
        className="flex-1 px-4 py-2 border bg-amber-50 border-gray-400 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        type="text"
        id="search"
        placeholder="Çekici, Dorse, Firma Ara..."
        onChange={(e) => setSearch(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition"
        disabled
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </button>
    </form>
  );
};

SearchBar.propTypes = {
  setSearch: PropTypes.func.isRequired,
};

export default SearchBar;
