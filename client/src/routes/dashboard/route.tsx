import { store } from "@/appStore/store";
import { notesApiSlice } from "@/api/notesApiSlice";
import { usersApiSlice } from "@/api/usersApiSlice";
import { useEffect, useRef } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import usePersist from "@/utils/hooks/usePersist";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "@/appStore/authSlice";
import { useRefreshMutation } from "@/api/authApiSlice";
import { LockKeyhole } from "lucide-react";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { PageLoader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [persist] = usePersist();
  const token = useSelector(selectCurrentToken);
  const effectRan = useRef(false);

  const [refresh, { isUninitialized, isLoading, isError, error }] =
    useRefreshMutation();

  // "Beni hatırla" açıksa, sayfa yenilendiğinde refresh cookie'si ile yeni
  // access token al.
  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        await refresh(undefined);
      } catch (err) {
        console.error(err);
      }
    };

    if (!token && persist) verifyRefreshToken();

    return () => {
      effectRan.current = true;
    };
    // eslint-disable-next-line
  }, []);

  // Token hazır olunca listeleri önceden yükle.
  useEffect(() => {
    if (!token) return;
    store.dispatch(notesApiSlice.util.prefetch("getNotes", "notesList", { force: true }));
    store.dispatch(notesApiSlice.util.prefetch("getRapor", 1, { force: true }));
    store.dispatch(usersApiSlice.util.prefetch("getUsers", "usersList", { force: true }));
  }, [token]);

  if (token) {
    return (
      <DashboardShell>
        <Outlet />
      </DashboardShell>
    );
  }

  if (persist && (isLoading || isUninitialized)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Oturum doğrulanıyor..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="bg-card w-full max-w-sm rounded-2xl border p-8 text-center shadow-sm">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <LockKeyhole className="size-6" />
        </div>
        <h1 className="text-lg font-semibold">Oturumunuz sona erdi</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isError
            ? apiErrorMessage(error, "Lütfen tekrar giriş yapın.")
            : "Devam etmek için lütfen giriş yapın."}
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Giriş Yap</Link>
        </Button>
      </div>
    </div>
  );
}
