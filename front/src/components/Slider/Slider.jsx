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
    <div className="relative h-[560px] w-full overflow-hidden">
      <h1 className="mb-4 text-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
        Hoşgeldiniz
      </h1>
      <div className="relative h-full w-full">
        <img
          className="h-full w-full object-cover"
          src={data[slide]}
          alt="slider"
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div
          className="cursor-pointer rounded-full bg-blue-500 p-2 text-white transition hover:bg-blue-600"
          onClick={preSlide}
        >
          <FontAwesomeIcon icon={faChevronLeft} size="xs" />
        </div>
        <div
          className="cursor-pointer rounded-full bg-blue-500 p-2 text-white transition hover:bg-blue-600"
          onClick={nextSlide}
        >
          <FontAwesomeIcon icon={faChevronRight} size="xs" />
        </div>
      </div>
    </div>
  );
};

export default Slider;
