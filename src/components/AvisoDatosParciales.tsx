import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

/**
 * Aviso de datos parciales: cuando el periodo seleccionado solo tiene datos de
 * un país, la normalización Min-Max no tiene rango real (máx=mín) y los scores
 * salen al 100% sin que eso signifique liderazgo. Este aviso solo informa; no
 * modifica ningún cálculo.
 */
const AvisoDatosParciales = ({
  anio,
  paisesConDatos,
}: {
  anio: number | string;
  paisesConDatos?: string[];
}) => {
  if (!paisesConDatos || paisesConDatos.length === 0 || paisesConDatos.length > 1) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Datos parciales para {anio}</AlertTitle>
      <AlertDescription className="text-amber-800 text-xs">
        Solo {paisesConDatos[0]} tiene datos cargados en este periodo, así que las puntuaciones no se
        comparan con otros países y pueden aparecer al 100%. Se corregirán automáticamente cuando se
        carguen datos de más territorios.
      </AlertDescription>
    </Alert>
  );
};

export default AvisoDatosParciales;
