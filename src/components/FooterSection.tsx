import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Github,
  Twitter,
  Linkedin
} from "lucide-react";

const FooterSection = () => {
  const quickLinks = [
    { label: "Dashboard", href: "#dashboard" },
    { label: "Informes", href: "#reports" },
    { label: "Datos Abiertos", href: "#data" },
    { label: "Participación", href: "#surveys" }
  ];

  const resources = [
    { label: "Documentación API", href: "#" },
    { label: "Metodología", href: "#" },
    { label: "Casos de Uso", href: "#" },
    { label: "FAQ", href: "#" }
  ];

  const partners = [
    { label: "Cámara de Valencia", href: "#" },
    { label: "Generalitat Valenciana", href: "#" },
    { label: "Red.es", href: "#" },
    { label: "INE", href: "#" }
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Brainnova</h3>
                <p className="text-sm text-muted-foreground">Ecosistema de Innovación</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Plataforma integral para el análisis, monitorización y desarrollo del ecosistema digital 
              de la Comunidad Valenciana.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-transparent">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 hover:bg-transparent">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 hover:bg-transparent">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Navegación</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent">
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Recursos</h4>
            <ul className="space-y-2">
              {resources.map((resource) => (
                <li key={resource.label}>
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent justify-start">
                    {resource.label}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Partners */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Contacto</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <span>Cámara de Comercio de Valencia<br />C/ Poeta Querol, 15<br />46002 Valencia</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>digital@camaravalencia.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>+34 963 103 900</span>
              </div>
            </div>

            <div className="pt-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Colaboradores</h5>
              <div className="grid grid-cols-2 gap-1">
                {partners.map((partner) => (
                  <Button 
                    key={partner.label} 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-auto text-xs text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent"
                  >
                    {partner.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © 2024 Brainnova Ecosystem. Todos los derechos reservados.
          </div>
          <div className="flex space-x-6 text-sm">
            <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent">
              Política de Privacidad
            </Button>
            <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent">
              Términos de Uso
            </Button>
            <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent">
              Cookies
            </Button>
            <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground hover:font-bold hover:bg-transparent">
              Accesibilidad
            </Button>
          </div>
        </div>

        {/* EU Funding Notice */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            Este proyecto ha sido cofinanciado por la Unión Europea a través del Programa Operativo FEDER 
            de la Comunitat Valenciana 2021-2027
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;