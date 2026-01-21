import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChatWidget from "@/components/ChatWidget";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminConfig from "./pages/AdminConfig";
import Surveys from "./pages/Surveys";
import SurveyForm from "./pages/SurveyForm";
import CreateSurvey from "./pages/CreateSurvey";
import OpenData from "./pages/OpenData";
import KPIsDashboard from "./pages/KPIsDashboard";
import Tendencias from "./pages/Tendencias";
import BrainnovaScore from "./pages/BrainnovaScore";
import Metodologia from "./pages/Metodologia";
import Informes from "./pages/Informes";
import EvolucionTemporal from "./pages/EvolucionTemporal";
import ComparacionTerritorial from "./pages/ComparacionTerritorial";
import Dimensiones from "./pages/Dimensiones";
import DimensionDetail from "./pages/DimensionDetail";
import SubdimensionDashboard from "./pages/SubdimensionDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dimensiones" 
                element={
                  <ProtectedRoute>
                    <Dimensiones />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dimensiones/detalle" 
                element={
                  <ProtectedRoute>
                    <DimensionDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/kpis/subdimension" 
                element={
                  <ProtectedRoute>
                    <SubdimensionDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-usuarios" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/config" 
                element={
                  <ProtectedRoute>
                    <AdminConfig />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/encuestas" 
                element={
                  <ProtectedRoute>
                    <Surveys />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/encuestas/crear" 
                element={
                  <ProtectedRoute>
                    <CreateSurvey />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/encuestas/:id" 
                element={
                  <ProtectedRoute>
                    <SurveyForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/datos-abiertos" 
                element={
                  <ProtectedRoute>
                    <OpenData />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/kpis" 
                element={
                  <ProtectedRoute>
                    <KPIsDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tendencias" 
                element={
                  <ProtectedRoute>
                    <Tendencias />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/brainnova-score" 
                element={
                  <ProtectedRoute>
                    <BrainnovaScore />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/metodologia" 
                element={
                  <ProtectedRoute>
                    <Metodologia />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/informes" 
                element={
                  <ProtectedRoute>
                    <Informes />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/evolucion" 
                element={
                  <ProtectedRoute>
                    <EvolucionTemporal />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/comparacion" 
                element={
                  <ProtectedRoute>
                    <ComparacionTerritorial />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <ChatWidget />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;