import { AuthLayout } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound } from "lucide-react";

export const Route = createFileRoute("/(auth)/forgot-password")({
  component: RouteComponent,
});

// Sistemde e-posta ile şifre sıfırlama yok: şifreleri otoparkın kurucusu
// "Kullanıcılar" sayfasından değiştirir.
function RouteComponent() {
  useTitle("Şifremi Unuttum");
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <KeyRound className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Şifrenizi mi unuttunuz?</h1>
          <p className="text-muted-foreground text-sm">
            Şifrenizi otoparkınızın yöneticisi (Kurucu) sıfırlayabilir. Yöneticinizden
            <span className="text-foreground font-medium"> Kullanıcılar </span>
            sayfasından size yeni bir şifre belirlemesini isteyin.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">
            <ArrowLeft /> Girişe dön
          </Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
