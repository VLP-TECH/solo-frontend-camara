import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [cif, setCif] = useState('');
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!/[0-9]/.test(password)) {
      return "La contraseña debe contener al menos un número";
    }
    if (!/[a-z]/.test(password)) {
      return "La contraseña debe contener al menos una letra minúscula";
    }
    if (!/[A-Z]/.test(password)) {
      return "La contraseña debe contener al menos una letra mayúscula";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message === 'Invalid login credentials') {
            toast({
              title: "Error de inicio de sesión",
              description: "Credenciales incorrectas. Verifica tu email y contraseña.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error de inicio de sesión",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "¡Bienvenido!",
            description: "Has iniciado sesión correctamente.",
          });
          navigate('/dashboard');
        }
      } else {
        if (!acceptPrivacyPolicy) {
          toast({
            title: "Política de privacidad",
            description: "Debes aceptar la política de privacidad para registrarte.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Validar contraseña
        const passwordError = validatePassword(password);
        if (passwordError) {
          toast({
            title: "Contraseña inválida",
            description: passwordError,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, firstName, lastName, razonSocial, cif);
        if (error) {
          if (error.message === 'User already registered') {
            toast({
              title: "Usuario ya registrado",
              description: "Ya existe una cuenta con este email. Intenta iniciar sesión.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error de registro",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "¡Registro exitoso!",
            description: "En breve validaremos tu acceso. Recibirás una notificación cuando tu cuenta esté activa.",
          });
          // Clear form and switch to login tab
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          setRazonSocial('');
          setCif('');
          setAcceptPrivacyPolicy(false);
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-md">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-6 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio
        </Button>

        <Card className="bg-background/95 backdrop-blur-sm border-border/50 shadow-strong">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Brainnova
            </CardTitle>
            <CardDescription>
              Accede a la plataforma del ecosistema digital valenciano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? "login" : "signup"} onValueChange={(value) => setIsLogin(value === "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu-email@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
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
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Nombre"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellidos</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Apellidos"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu-email@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mín. 8 caracteres, números, letras y mayúsculas"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
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
                      La contraseña debe tener al menos 8 caracteres, incluir números, letras minúsculas y mayúsculas
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="razonSocial">Razón Social</Label>
                    <Input
                      id="razonSocial"
                      type="text"
                      placeholder="Razón Social"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cif">CIF</Label>
                    <Input
                      id="cif"
                      type="text"
                      placeholder="CIF"
                      value={cif}
                      onChange={(e) => setCif(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="privacyPolicy"
                      checked={acceptPrivacyPolicy}
                      onCheckedChange={(checked) => setAcceptPrivacyPolicy(checked === true)}
                      required
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="privacyPolicy"
                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Aceptas la política de privacidad de Cámara Valencia. Puedes verla{' '}
                        <a
                          href="https://www.camaravalencia.com/politica-de-privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          aquí
                        </a>
                        .
                      </Label>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading || !acceptPrivacyPolicy}>
                    {loading ? "Registrando..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;