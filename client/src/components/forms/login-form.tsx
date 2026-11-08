import { useLoginMutation } from "@/api/authApiSlice";
import { setCredentials } from "@/appStore/authSlice";
import { ErrorAlert, Field } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import usePersist from "@/utils/hooks/usePersist";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

export function LoginForm() {
  const userRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [persist, setPersist] = usePersist();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { accessToken } = await login({ username, password }).unwrap();
      dispatch(setCredentials({ accessToken }));
      setUsername("");
      setPassword("");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const e = err as { status?: number; data?: { message?: string } };
      if (!e.status || e.status === ("FETCH_ERROR" as never)) {
        setErrMsg("Sunucu cevap vermiyor");
      } else if (e.status === 400) {
        setErrMsg("Kullanıcı adı ve şifre gerekli");
      } else {
        setErrMsg(e.data?.message ?? "Giriş yapılamadı");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz</h1>
        <p className="text-muted-foreground text-sm">Devam etmek için hesabınıza giriş yapın.</p>
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Kullanıcı adı" htmlFor="username">
          <Input
            id="username"
            ref={userRef}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="h-10"
          />
        </Field>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Şifre
            </label>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary text-xs">
              Şifremi unuttum
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={persist}
            onChange={() => setPersist((prev: boolean) => !prev)}
            className="accent-primary size-4 rounded"
          />
          Beni hatırla
        </label>

        <Button type="submit" className="h-10 w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin" />}
          {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Hesabınız yok mu?{" "}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          Kayıt olun
        </Link>
      </p>
    </div>
  );
}
