import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, isActive } = useUserProfile();
  const navigate = useNavigate();

  // Mostrar loading mientras se verifica la autenticación
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, redirigir a /auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Si el usuario no está activo, mostrar mensaje de espera
  if (profile && !isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Cuenta pendiente de validación</CardTitle>
            <CardDescription className="mt-2">
              En breve validaremos tu acceso. Recibirás una notificación cuando tu cuenta esté activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Si tienes alguna pregunta, contacta con el administrador del sistema.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay usuario activo, mostrar el contenido protegido
  return <>{children}</>;
};

export default ProtectedRoute;