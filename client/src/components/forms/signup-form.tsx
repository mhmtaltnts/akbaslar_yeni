import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";
import { useSignup } from "@/api/auth";
import { useSiteBrand } from "@/utils/hooks/useSite";

// Form şeması düzeltmesi
const formSchema = z.object({
  fullname: z.string().min(3, "Ad Soyad en az 3 karakter olmalı"),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  password: z.string().min(4, "Şifre en az 4 karakter olmalı"),
  park: z.string().trim().min(1, "Otopark kodu gerekli"),
});

interface ErrorResponse {
  status?: number;
  data?: {
    message?: string;
    success?: boolean;
  };
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const signup = useSignup();
  const isLoading = signup.isPending;
  const navigate = useNavigate();
  // Site bir otoparkın alan adından açıldıysa (örn. akbaslartirparki.com)
  // otopark kodu oradan gelir; kullanıcı isterse değiştirebilir.
  const { site } = useSiteBrand();
  const [editPark, setEditPark] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullname: "",
      username: "",
      password: "",
      park: "",
    },
  });

  useEffect(() => {
    if (site && !form.getValues("park")) form.setValue("park", site.slug);
  }, [site, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Çoklu otopark: kayıt, kullanıcıyı otopark koduyla belirtilen
      // otoparka PASİF olarak ekler; kurucu onaylayınca giriş yapılabilir.
      const result = await signup.mutateAsync(values);
      toast.success(result.message);
      navigate({ to: "/login" });
    } catch (error: unknown) {
      // 3. Hata yakalama
      console.error("Signup error:", error);

      // RTK Query hatasını tip güvenli şekilde işle
      const err = error as ErrorResponse;

      if (err?.data?.message) {
        // API'den gelen hata mesajı
        toast.error(err.data.message);
      } else if (err?.status === 400) {
        toast.error("Geçersiz form verisi");
      } else if (err?.status === 409) {
        toast.error("Bu kullanıcı adı zaten kayıtlı");
      } else if (err?.status === 500) {
        toast.error("Sunucu hatası, lütfen daha sonra tekrar deneyin");
      } else {
        // Genel hata
        toast.error("Bir hata oluştu, lütfen tekrar deneyin");
      }
    }
  }

  const field = (
    name: "fullname" | "username" | "park" | "password",
    label: string,
    opts: { placeholder?: string; type?: string; hint?: string; className?: string } = {},
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={opts.placeholder}
              type={opts.type ?? "text"}
              disabled={isLoading}
              className={cn("h-10", opts.className)}
              {...field}
            />
          </FormControl>
          {opts.hint && <p className="text-muted-foreground text-xs">{opts.hint}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Hesap oluşturun</h1>
        <p className="text-muted-foreground text-sm">
          Hesabınız, otopark yöneticisi onayladıktan sonra aktif olur.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {site && !editPark ? (
            <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Kayıt olunacak otopark</p>
                <p className="truncate text-sm font-medium">{site.name}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={() => {
                  form.setValue("park", "");
                  setEditPark(true);
                }}
              >
                Değiştir
              </Button>
            </div>
          ) : (
            field("park", "Otopark kodu", {
              placeholder: "ör. muallimkoy",
              className: "font-mono",
              hint: "Kodu otopark yöneticinizden alabilirsiniz.",
            })
          )}
          {field("fullname", "Ad soyad", { placeholder: "Ahmet Yılmaz" })}
          {field("username", "Kullanıcı adı", { placeholder: "ahmet.yilmaz" })}
          {field("password", "Şifre", { type: "password" })}

          <Button className="h-10 w-full" disabled={isLoading} type="submit">
            {isLoading && <Loader2 className="animate-spin" />}
            {isLoading ? "Kaydediliyor..." : "Kayıt Ol"}
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground text-center text-sm">
        Zaten hesabınız var mı?{" "}
        <Link className="text-primary font-medium hover:underline" to="/login">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
