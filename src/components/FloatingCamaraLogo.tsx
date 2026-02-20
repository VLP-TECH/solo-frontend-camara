import { CAMARA_VALENCIA_LOGO_SRC } from "@/lib/logo-assets";

/**
 * Logo de Cámara Valencia flotante, abajo a la izquierda.
 * Se muestra en todas las secciones con sidebar (dashboard, dimensiones, informes, etc.).
 */
const FloatingCamaraLogo = () => (
  <a
    href="https://www.camaravalencia.com"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-4 left-4 z-50 hover:opacity-80 transition-opacity"
  >
    <img
      src={CAMARA_VALENCIA_LOGO_SRC}
      alt="Cámara València"
      className="h-10 sm:h-12 w-auto object-contain object-left drop-shadow-lg"
    />
  </a>
);

export default FloatingCamaraLogo;
