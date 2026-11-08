import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./page";
import { ThemeToggle } from "./theme";

// Giriş / kayıt sayfaları: solda görsel panel, sağda form.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/img/konak-park-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-blue-900/70 to-blue-800/40" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/">
            <Brand name={import.meta.env.VITE_APP_TITLE} className="text-lg [&>span:first-child]:bg-white [&>span:first-child]:bg-none [&>span:first-child]:text-blue-800" />
          </Link>
          <div className="max-w-md space-y-3">
            <p className="text-3xl font-semibold tracking-tight">Park operasyonlarınız tek ekranda.</p>
            <p className="text-white/75">
              Araç giriş-çıkışları, gümrük bilgileri ve raporlar — tüm ekibiniz için anlık.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link to="/" className="lg:invisible">
            <Brand name={import.meta.env.VITE_APP_TITLE} className="text-sm" />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
