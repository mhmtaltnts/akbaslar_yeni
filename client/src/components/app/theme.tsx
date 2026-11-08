import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Moon, Sun } from "lucide-react";
import { selectCurrentTheme, setTheme } from "@/appStore/themeSlice";
import { Button } from "@/components/ui/button";

// Redux'taki tema state'ini `<html class="dark">`'a ve localStorage'a yansıtır.
export function ThemeSync() {
  const dark = useSelector(selectCurrentTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* gizli sekme vb. -- tercih kaydedilemezse sorun değil */
    }
  }, [dark]);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSelector(selectCurrentTheme);
  const dispatch = useDispatch();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      title={dark ? "Açık tema" : "Koyu tema"}
      aria-label="Temayı değiştir"
      onClick={() => dispatch(setTheme({ darkness: !dark }))}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
