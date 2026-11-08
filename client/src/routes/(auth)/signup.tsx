import { AuthLayout } from "@/components/app/auth-layout";
import { SignupForm } from "@/components/forms/signup-form";
import useTitle from "@/utils/hooks/useTitle";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  useTitle("Kayıt Ol");
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
