import {
  faEllipsis,
  faRightFromBracket,
  faPersonMilitaryPointing,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

const DropdownMenu = ({ noteId }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

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

  const adjustDropdownPosition = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;

    if (trigger && menu) {
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 192; // fallback width if not rendered
      const spaceRight = window.innerWidth - triggerRect.left;

      let left = triggerRect.left + window.scrollX;

      // If dropdown would overflow to the right, align it from the right
      if (spaceRight < menuWidth) {
        left = triggerRect.right - menuWidth + window.scrollX;
      }

      const top = triggerRect.bottom + window.scrollY;

      setCoords({ top, left });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      adjustDropdownPosition();
    }
  }, [isOpen]);

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

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
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
        if (focusedIndex >= 0) {
          menuItems[focusedIndex].action();
          closeMenu();
        }
        break;
      case "Escape":
        closeMenu();
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Trigger button stays in original DOM flow (e.g. inside table cell) */}
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className="flex h-12 w-12 cursor-pointer items-center justify-center bg-inherit text-center"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faEllipsis} className="text-2xl" />
      </button>

      {/* Dropdown menu rendered in portal */}
      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            className="absolute z-50 w-48 divide-y border bg-white shadow-lg dark:bg-gray-800"
            style={{ top: coords.top, left: coords.left, position: "absolute" }}
            role="menu"
          >
            {menuItems.map((item, index) => (
              <li
                key={item.label}
                role="menuitem"
                tabIndex="0"
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 ${
                  focusedIndex === index
                    ? "bg-gray-300 dark:bg-gray-800"
                    : index % 2 === 0
                      ? "bg-mygray-100 dark:bg-gray-600"
                      : "bg-mygray-200 dark:bg-gray-700"
                }`}
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
          </ul>,
          document.getElementById("dropdown-portal"),
        )}
    </>
  );
};

DropdownMenu.propTypes = {
  noteId: PropTypes.string.isRequired,
};

export default DropdownMenu;
