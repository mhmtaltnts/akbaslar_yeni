import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

const Slider = () => {
  const [slide, setSlide] = useState(0);

  const preSlide = () => {
    setSlide(slide === 0 ? 4 : (pre) => pre - 1);
  };

  const nextSlide = () => {
    setSlide(slide === 4 ? 0 : (pre) => pre + 1);
  };

  const data = [
    "img/konak-park-1.jpg",
    "img/konak-park-2.jpg",
    "img/konak-park-3.jpg",
    "img/konak-park-4.jpg",
    "img/konak-park-5.jpg",
  ];

  return (
    <div className="relative w-full h-[560px] overflow-hidden">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-4">
        Hoşgeldiniz
      </h1>
      <div className="relative w-full h-full">
        <img
          className="w-full h-full object-cover"
          src={data[slide]}
          alt="slider"
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div
          className="p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition"
          onClick={preSlide}
        >
          <FontAwesomeIcon icon={faChevronLeft} size="xs" />
        </div>
        <div
          className="p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition"
          onClick={nextSlide}
        >
          <FontAwesomeIcon icon={faChevronRight} size="xs" />
        </div>
      </div>
    </div>
  );
};

export default Slider;
