import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una letra minúscula';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una letra mayúscula';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'La contraseña debe contener al menos un carácter especial';
  }
  return null;
};

const EstablecerPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: 'Enlace no válido',
        description: 'Falta el token de acceso. Abre el enlace recibido por correo.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Vuelve a escribir la misma contraseña en ambos campos.',
        variant: 'destructive',
      });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      toast({ title: 'Contraseña inválida', description: pwdError, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-password', {
        body: { token, password },
      });
      const result = data as { ok?: boolean; error?: string } | null;
      if (error || result?.ok !== true) {
        toast({
          title: 'No se pudo establecer la contraseña',
          description: result?.error || error?.message || 'El enlace puede haber caducado o ya haberse utilizado.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      setDone(true);
      toast({
        title: 'Contraseña establecida',
        description: 'Ya puedes iniciar sesión en Brainnova.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-md">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 shadow-strong">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Brainnova
            </CardTitle>
            <CardDescription>
              {done ? 'Tu contraseña se ha establecido' : 'Establece tu contraseña de acceso'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token && !done && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  El enlace no es válido o está incompleto. Abre el enlace tal como aparece en el correo de activación.
                </span>
              </div>
            )}

            {done ? (
              <div className="space-y-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    Tu contraseña se ha guardado correctamente. Ya puedes iniciar sesión con tu correo y tu nueva contraseña.
                  </p>
                </div>
                <Button className="w-full" onClick={() => navigate('/auth')}>
                  Ir a iniciar sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Repetir contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !token}>
                  {loading ? 'Guardando...' : 'Establecer contraseña'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstablecerPassword;
