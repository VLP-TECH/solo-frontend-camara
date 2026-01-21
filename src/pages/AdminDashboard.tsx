import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Plus, 
  Edit, 
  LogOut,
  LayoutDashboard,
  Layers,
  LineChart,
  Map,
  BookOpen,
  Clock,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  razon_social: string | null;
  cif: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { roles } = usePermissions();
  const {
    profile,
    loading,
    isAdmin,
    isActive
  } = useUserProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    razonSocial: '',
    cif: '',
    role: 'user'
  });
  const [selectedTerritorio, setSelectedTerritorio] = useState("Comunitat Valenciana");
  const [selectedAno, setSelectedAno] = useState("2024");
  const [selectedReferencia, setSelectedReferencia] = useState("Media UE");
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard General", href: "/dashboard" },
    { icon: Layers, label: "Dimensiones", href: "/dimensiones" },
    { icon: LineChart, label: "Todos los Indicadores", href: "/kpis" },
    { icon: Map, label: "Comparación Territorial", href: "/comparacion" },
    { icon: Clock, label: "Evolución Temporal", href: "/evolucion" },
    { icon: FileText, label: "Informes", href: "/informes" },
    { icon: MessageSquare, label: "Encuestas", href: "/encuestas" },
    { icon: BookOpen, label: "Metodología", href: "/metodologia" },
    { icon: Shield, label: "Gestión de Usuarios", href: "/admin-usuarios", active: true },
  ];

  useEffect(() => {
    if (!loading) {
      if (profile && isAdmin && isActive) {
        fetchProfiles();
      } else {
        setLoadingProfiles(false);
      }
    }
  }, [profile, isAdmin, isActive, loading]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', {
      ascending: false
    });
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setLoadingProfiles(false);
  };

  const toggleUserActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase.from('profiles').update({
      active: !currentActive
    }).eq('user_id', userId);
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
        variant: "destructive"
      });
      console.error('Error updating user status:', error);
    } else {
      toast({
        title: "Éxito",
        description: `Usuario ${!currentActive ? 'activado' : 'desactivado'} correctamente`
      });
      fetchProfiles();
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({
      role: newRole
    }).eq('user_id', userId);
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario",
        variant: "destructive"
      });
      console.error('Error updating user role:', error);
    } else {
      toast({
        title: "Éxito",
        description: "Rol actualizado correctamente"
      });
      fetchProfiles();
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            first_name: newUser.firstName,
            last_name: newUser.lastName
          }
        }
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').update({
          razon_social: newUser.razonSocial,
          cif: newUser.cif,
          role: newUser.role,
          active: true
        }).eq('user_id', data.user.id);
        if (profileError) throw profileError;
      }
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente"
      });
      setShowCreateUser(false);
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        razonSocial: '',
        cif: '',
        role: 'user'
      });
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive"
      });
      console.error('Error creating user:', error);
    }
  };

  if (loading || loadingProfiles) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c6c8b] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile || !isAdmin || !isActive) {
    return <Navigate to="/" replace />;
  }

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => p.active).length;
  const pendingUsers = profiles.filter(p => !p.active).length;
  const adminUsers = profiles.filter(p => p.role === 'admin').length;
  const editorUsers = profiles.filter(p => p.role === 'editor').length;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0c6c8b] text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-[#0c6c8b] rounded"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold">BRAINNOVA</h1>
              <p className="text-xs text-blue-200">Economía Digital</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;
              return (
                <button
                  key={item.label}
                  onClick={() => item.href && navigate(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                    isActive
                      ? "bg-[#0a5a73] text-white"
                      : "text-blue-100 hover:bg-[#0a5a73]/50"
                  }`}
                  style={isActive ? {
                    borderLeft: '4px solid #4FD1C7'
                  } : {}}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-blue-600">
          <p className="text-xs text-blue-200">Versión 2025</p>
          <p className="text-xs text-blue-200">Actualizado Nov 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-[#0c6c8b] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">BRAINNOVA Economía Digital</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white hover:bg-white/10 flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Salir</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Title Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#0c6c8b] mb-2">
                    Gestión de Usuarios
                  </h1>
                  <p className="text-lg text-gray-600">
                    Gestiona usuarios y permisos de acceso al sistema
                  </p>
                </div>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0c6c8b] hover:bg-[#0a5a73] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="firstName">Nombre *</Label>
                          <Input 
                            id="firstName" 
                            value={newUser.firstName} 
                            onChange={e => setNewUser({...newUser, firstName: e.target.value})} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="lastName">Apellidos</Label>
                          <Input 
                            id="lastName" 
                            value={newUser.lastName} 
                            onChange={e => setNewUser({...newUser, lastName: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={newUser.email} 
                          onChange={e => setNewUser({...newUser, email: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña *</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          value={newUser.password} 
                          onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="razonSocial">Razón Social</Label>
                        <Input 
                          id="razonSocial" 
                          value={newUser.razonSocial} 
                          onChange={e => setNewUser({...newUser, razonSocial: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cif">CIF</Label>
                        <Input 
                          id="cif" 
                          value={newUser.cif} 
                          onChange={e => setNewUser({...newUser, cif: e.target.value})} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={value => setNewUser({...newUser, role: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuario</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={createUser} className="bg-[#0c6c8b] hover:bg-[#0a5a73]">
                        Crear Usuario
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total usuarios</CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios activos</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                  <UserX className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{pendingUsers}</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Editores</CardTitle>
                  <Edit className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{editorUsers}</div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <Shield className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{adminUsers}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de usuarios */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Razón Social</TableHead>
                      <TableHead>CIF</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha registro</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map(userProfile => (
                      <TableRow key={userProfile.id}>
                        <TableCell className="font-medium">
                          {userProfile.email || 'Sin email'}
                        </TableCell>
                        <TableCell>
                          {userProfile.first_name && userProfile.last_name 
                            ? `${userProfile.first_name} ${userProfile.last_name}` 
                            : 'Sin nombre'}
                        </TableCell>
                        <TableCell>
                          {userProfile.razon_social || 'No especificada'}
                        </TableCell>
                        <TableCell>
                          {userProfile.cif || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              userProfile.role === 'admin' 
                                ? 'default' 
                                : userProfile.role === 'editor' 
                                  ? 'outline' 
                                  : 'secondary'
                            }
                          >
                            {userProfile.role === 'admin' 
                              ? 'Administrador' 
                              : userProfile.role === 'editor' 
                                ? 'Editor' 
                                : 'Usuario'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userProfile.active ? 'default' : 'destructive'}>
                            {userProfile.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(userProfile.created_at).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant={userProfile.active ? "destructive" : "default"} 
                              onClick={() => toggleUserActive(userProfile.user_id, userProfile.active)} 
                              disabled={userProfile.user_id === profile?.user_id}
                              className={userProfile.active ? "bg-red-600 hover:bg-red-700" : "bg-[#0c6c8b] hover:bg-[#0a5a73]"}
                            >
                              {userProfile.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            
                            {userProfile.user_id !== profile?.user_id && (
                              <Select 
                                value={userProfile.role} 
                                onValueChange={newRole => updateUserRole(userProfile.user_id, newRole)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Usuario</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
