import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Brand } from "@/components/app/page";
import { ThemeToggle } from "@/components/app/theme";
import { Button } from "@/components/ui/button";
import { useSiteBrand } from "@/utils/hooks/useSite";

const PublicHeader = () => {
  const { name } = useSiteBrand();
  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="min-w-0">
          <Brand name={name} className="text-base" />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/notes-list" activeProps={{ className: "text-primary" }}>
              Misafir Araçlar
            </Link>
          </Button>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/login">
              <LogIn /> Giriş
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
