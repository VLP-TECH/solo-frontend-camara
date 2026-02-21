-- Unificar nombre_indicador para "Cobertura VHCN": en definiciones hay un solo indicador
-- ("Cobertura de redes de muy alta capacidad (VHCN)", id 38), pero en resultado_indicadores
-- existían dos variantes por mayúsculas: "Cobertura De Redes Vhcn" (310) y "Cobertura De Redes VHCN" (620).
-- Se unifican todas al nombre canónico de definiciones para que la app muestre un solo indicador con todos los datos.

UPDATE resultado_indicadores
SET nombre_indicador = 'Cobertura de redes de muy alta capacidad (VHCN)'
WHERE nombre_indicador IN ('Cobertura De Redes Vhcn', 'Cobertura De Redes VHCN');
