import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Loader2,
  Trash2,
  KeyRound,
  User,
} from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import { BRAINNOVA_LOGO_SRC, CAMARA_VALENCIA_LOGO_SRC } from "@/lib/logo-assets";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[0-9]/.test(password)) return "La contraseña debe contener al menos un número";
  if (!/[a-z]/.test(password)) return "La contraseña debe contener al menos una letra minúscula";
  if (!/[A-Z]/.test(password)) return "La contraseña debe contener al menos una letra mayúscula";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "La contraseña debe contener al menos un carácter especial";
  }
  return null;
};

const EditarUsuario = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, isAdmin, refreshProfile } = useUserProfile();
  const { toast } = useToast();

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    razon_social: "",
    cif: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        razon_social: profile.razon_social ?? "",
        cif: profile.cif ?? "",
      });
    }
  }, [profile?.id, profile?.first_name, profile?.last_name, profile?.razon_social, profile?.cif]);

  const menuItems = useAppMenuItems();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          razon_social: form.razon_social || null,
          cif: form.cif || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "Datos guardados", description: "Tu información se ha actualizado correctamente." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message ?? "No se pudieron guardar los datos.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas nuevas no coinciden.", variant: "destructive" });
      return;
    }
    const err = validatePassword(newPassword);
    if (err) {
      toast({ title: "Error", description: err, variant: "destructive" });
      return;
    }
    if (!user?.email) return;
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast({
          title: "Contraseña actual incorrecta",
          description: "Verifica la contraseña actual e inténtalo de nuevo.",
          variant: "destructive",
        });
        setChangingPassword(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Contraseña actualizada", description: "Tu contraseña se ha cambiado correctamente." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message ?? "No se pudo cambiar la contraseña.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          deleted_by_user: true,
          deleted_at: new Date().toISOString(),
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await signOut();
      navigate("/", { replace: true });
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido dada de baja. Ya no podrás acceder a la aplicación.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message ?? "No se pudo completar la baja.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c6c8b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img
              src={BRAINNOVA_LOGO_SRC}
              alt="Brainnova"
              className="h-40 w-auto object-contain"
            />
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon as React.ComponentType<{ className?: string }>;
              const isActive = item.active;
              const isDisabled = item.disabled ?? false;
              return (
                <button
                  key={item.label}
                  onClick={() => !isDisabled && item.href && navigate(item.href)}
                  disabled={isDisabled}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive ? "bg-[#0a5a73] text-white" : isDisabled ? "text-blue-300 opacity-50 cursor-not-allowed" : "text-blue-100 hover:bg-[#0a5a73]/50"
                  }`}
                  style={isActive ? { borderLeft: "4px solid #4FD1C7" } : {}}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-6">
          <a href="https://www.camaravalencia.com" target="_blank" rel="noopener noreferrer" className="block mb-4">
            <img src={CAMARA_VALENCIA_LOGO_SRC} alt="Cámara Valencia" className="h-40 w-auto object-contain" />
          </a>
          <p className="text-xs text-blue-200">Versión 2026</p>
          <p className="text-xs text-blue-200">Actualizado Febrero 2026</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-blue-100 text-[#0c6c8b] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Plataforma de Economía Digital</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">Editar usuario</h1>
              <p className="text-lg text-gray-600">Gestiona tu información personal, contraseña y cuenta.</p>
            </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos personales
              </CardTitle>
              <CardDescription>Actualiza tu nombre, razón social y CIF. El email no se puede modificar aquí.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={user?.email ?? ""} disabled className="bg-gray-50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nombre</Label>
                    <Input
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Apellidos</Label>
                    <Input
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                      placeholder="Apellidos"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Razón social (opcional)</Label>
                  <Input
                    value={form.razon_social}
                    onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
                    placeholder="Razón social"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>CIF (opcional)</Label>
                  <Input
                    value={form.cif}
                    onChange={(e) => setForm((f) => ({ ...f, cif: e.target.value }))}
                    placeholder="CIF"
                  />
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar datos
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Cambiar contraseña
              </CardTitle>
              <CardDescription>Introduce tu contraseña actual y la nueva contraseña (mín. 8 caracteres, mayúscula, minúscula, número y carácter especial).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Contraseña actual</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="Contraseña actual"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nueva contraseña</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Nueva contraseña"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Repetir nueva contraseña</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repetir nueva contraseña"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Cambiar contraseña
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Trash2 className="h-5 w-5" />
                Eliminar cuenta
              </CardTitle>
              <CardDescription>
                Dar de baja tu cuenta es irreversible. Se marcará tu cuenta como eliminada y no podrás volver a acceder. Los datos se conservan en el sistema pero tu acceso quedará bloqueado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Dar de baja mi cuenta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se marcará tu cuenta como dada de baja y se bloqueará el acceso. No podrás volver a iniciar sesión. Los datos se mantienen en el sistema por motivos legales. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAccount();
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sí, dar de baja mi cuenta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditarUsuario;
