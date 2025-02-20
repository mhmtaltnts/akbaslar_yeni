const TruckSVG = ({ className = "w-8 h-8" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className={className}
  >
    <circle
      cx="6.626"
      cy="23.74"
      r="2"
      fill="rgb(0, 123, 255)"
      transform="matrix(1.519095, 0, 0, 1.432579, -3.396262, -11.134605)"
    />
    <circle
      cx="23.99"
      cy="23.74"
      r="2"
      fill="rgb(0, 123, 255)"
      transform="matrix(1.50828, 0, 0, 1.410949, -12.301781, -10.577852)"
    />
    <path
      strokeWidth="0.5"
      fill="rgb(0, 123, 255)"
      d="M 1.882 16.991 L 0.887 23.479 L 3.309 23.696 L 4.088 19.759 
          L 9.322 19.846 L 10.057 24.128 L 20.396 24.301 L 21.478 19.889 
          L 26.539 19.932 L 27.49 24.258 L 31.038 24.388 L 31.038 16.255 
          L 29.826 15.001 L 29.134 4.532 L 27.966 3.494 L 21.261 3.321 
          L 21.131 16.515 L 1.882 16.991 Z"
    />
    <path
      strokeLinecap="round"
      strokeMiterlimit="1.96"
      fill="rgb(255, 193, 7)"
      stroke="rgb(20, 149, 35)"
      paintOrder="fill"
      d="M 4.694 15.683 L 20.223 15.164 L 20.223 13.261 
          L 11.442 13.434 L 12.956 11.314 L 13.561 8.07 
          C 13.561 8.07 12.739 5.345 12.696 5.215 
          C 12.653 5.085 9.279 3.268 9.279 3.268 
          L 5.472 3.441 L 2.79 5.214 
          C 2.79 5.214 1.752 8.416 1.752 8.459 
          C 1.752 8.502 1.881 12.352 1.881 12.352 
          L 4.694 15.683 Z"
    />
  </svg>
);

export default TruckSVG;
