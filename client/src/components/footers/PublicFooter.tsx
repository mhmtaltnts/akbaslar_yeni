import { MapPin } from "lucide-react";

const MAPS_URL =
  "http://maps.google.com/maps/place/Gebze+Konak+Tır+Parkı/@40.814112,29.4578733,17z/data=!3m1!4b1!4m6!3m5!1s0x14cb20d9dd4dd139:0x70a1165aa635b25e!8m2!3d40.814108!4d29.460062!16s%2Fg%2F11b7q2wk4h";

const PublicFooter = () => {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6">
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <MapPin className="size-4 shrink-0" />
          <address className="not-italic">{import.meta.env.VITE_APP_ADDRESS}</address>
        </a>
        <p>
          © {new Date().getFullYear()} {import.meta.env.VITE_APP_TITLE}
        </p>
      </div>
    </footer>
  );
};

export default PublicFooter;
