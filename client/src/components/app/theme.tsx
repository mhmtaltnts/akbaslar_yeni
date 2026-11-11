import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useDarkMode();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      title={dark ? "Açık tema" : "Koyu tema"}
      aria-label="Temayı değiştir"
      onClick={toggle}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
