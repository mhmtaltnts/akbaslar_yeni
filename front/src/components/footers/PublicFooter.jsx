const PublicFooter = () => {
  return (
    <footer className="h-footer w-full py-4 px-6 ">
      <address className="max-w-4xl mx-auto text-center not-italic">
        <a
          href="http://maps.google.com/maps/place/Gebze+Konak+Tır+Parkı/@40.814112,29.4578733,17z/data=!3m1!4b1!4m6!3m5!1s0x14cb20d9dd4dd139:0x70a1165aa635b25e!8m2!3d40.814108!4d29.460062!16s%2Fg%2F11b7q2wk4h"
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="text-lg font-semibold">
            {import.meta.env.VITE_APP_ADDRESS}
          </p>
        </a>
      </address>
    </footer>
  );
};

export default PublicFooter;
