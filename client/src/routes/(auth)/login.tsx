import { AuthLayout } from "@/components/app/auth-layout";
import { LoginForm } from "@/components/forms/login-form";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Giriş Yap");
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
