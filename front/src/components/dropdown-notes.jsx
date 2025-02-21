import {
  faEllipsis,
  faRightFromBracket,
  faPersonMilitaryPointing,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
const DropdownMenu = ({ noteId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [position, setPosition] = useState("bottom");
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "Değiştir",
      icon: faEdit,
      action: () => navigate(`/dash/notes/${noteId}`),
    },
    {
      label: "Gümrük",
      icon: faPersonMilitaryPointing,
      action: () => navigate(`/dash/gumruk/${noteId}`),
    },
    {
      label: "Çıkış",
      icon: faRightFromBracket,
      action: () => navigate(`/dash/cikis/${noteId}`),
    },
  ];

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
    adjustDropdownPosition();
  };
  const closeMenu = () => {
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
        break;
      case "ArrowUp":
        setFocusedIndex(
          (prev) => (prev - 1 + menuItems.length) % menuItems.length,
        );
        break;
      case "Enter":
        if (focusedIndex >= 0) menuItems[focusedIndex].action();
        closeMenu();
        break;
      case "Escape":
        closeMenu();
        break;
      default:
        break;
    }
  };

  const adjustDropdownPosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (spaceBelow < 150 && spaceAbove > spaceBelow) {
      setPosition("top");
    } else {
      setPosition("bottom");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block">
      {/* Dropdown Trigger */}
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className="flex h-12 w-12 cursor-pointer items-center justify-center bg-inherit text-center"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faEllipsis} className="text-2xl" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          tabIndex="-1"
          onKeyDown={handleKeyDown}
          className={`absolute z-50 w-48 divide-y border bg-white dark:bg-gray-800 ${
            position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          } right-0`}
        >
          {menuItems.map((item, index) => (
            <li
              key={item.label}
              role="menuitem"
              tabIndex="0"
              className={`flex cursor-pointer items-center gap-2 px-4 py-2 ${
                focusedIndex === index ? "bg-gray-300 dark:bg-gray-800" : ""
              } ${index % 2 === 0 ? "bg-mygray-100 dark:bg-gray-600" : "bg-mygray-200 dark:bg-gray-700"}`}
              onClick={() => {
                item.action();
                closeMenu();
              }}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
DropdownMenu.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
  isManager: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  noteId: PropTypes.string.isRequired,
};
export default DropdownMenu;
