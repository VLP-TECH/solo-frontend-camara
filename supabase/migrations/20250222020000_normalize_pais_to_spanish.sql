-- Normaliza nombres de pais en resultado_indicadores a espanol (UTF-8 correcto).
-- Unifica nombres en ingles, variantes con encoding corrupto y duplicados.

UPDATE public.resultado_indicadores SET pais = 'España' WHERE pais = 'Spain';
UPDATE public.resultado_indicadores SET pais = 'España' WHERE pais LIKE 'Espa_a' AND pais != 'España';

UPDATE public.resultado_indicadores SET pais = 'Alemania' WHERE pais = 'Germany';

UPDATE public.resultado_indicadores SET pais = 'Francia' WHERE pais = 'France';

UPDATE public.resultado_indicadores SET pais = 'Italia' WHERE pais = 'Italy';

UPDATE public.resultado_indicadores SET pais = 'Bélgica' WHERE pais = 'Belgium';
UPDATE public.resultado_indicadores SET pais = 'Bélgica' WHERE pais LIKE 'B_lgica' AND pais != 'Bélgica';

UPDATE public.resultado_indicadores SET pais = 'Países Bajos' WHERE pais = 'Netherlands';
UPDATE public.resultado_indicadores SET pais = 'Países Bajos' WHERE pais LIKE 'Pa_ses Bajos' AND pais != 'Países Bajos';

UPDATE public.resultado_indicadores SET pais = 'Hungría' WHERE pais = 'Hungary';
UPDATE public.resultado_indicadores SET pais = 'Hungría' WHERE pais LIKE 'Hungr_a' AND pais != 'Hungría';

UPDATE public.resultado_indicadores SET pais = 'Rumanía' WHERE pais = 'Romania';
UPDATE public.resultado_indicadores SET pais = 'Rumanía' WHERE pais LIKE 'Ruman_a' AND pais != 'Rumanía';

UPDATE public.resultado_indicadores SET pais = 'República Checa' WHERE pais = 'Czechia';
UPDATE public.resultado_indicadores SET pais = 'República Checa' WHERE pais LIKE 'Rep_blica Checa' AND pais != 'República Checa';

UPDATE public.resultado_indicadores SET pais = 'Turquía' WHERE pais IN ('Türkiye');
UPDATE public.resultado_indicadores SET pais = 'Turquía' WHERE pais LIKE 'Turqu_a' AND pais != 'Turquía';

UPDATE public.resultado_indicadores SET pais = 'Croacia' WHERE pais = 'Croatia';

UPDATE public.resultado_indicadores SET pais = 'Dinamarca' WHERE pais = 'Denmark';

UPDATE public.resultado_indicadores SET pais = 'Finlandia' WHERE pais = 'Finland';

UPDATE public.resultado_indicadores SET pais = 'Grecia' WHERE pais = 'Greece';

UPDATE public.resultado_indicadores SET pais = 'Irlanda' WHERE pais = 'Ireland';

UPDATE public.resultado_indicadores SET pais = 'Noruega' WHERE pais = 'Norway';

UPDATE public.resultado_indicadores SET pais = 'Polonia' WHERE pais = 'Poland';

UPDATE public.resultado_indicadores SET pais = 'Suecia' WHERE pais = 'Sweden';

UPDATE public.resultado_indicadores SET pais = 'Suiza' WHERE pais = 'Switzerland';

UPDATE public.resultado_indicadores SET pais = 'Reino Unido' WHERE pais = 'United Kingdom';

UPDATE public.resultado_indicadores SET pais = 'Letonia' WHERE pais = 'Latvia';

UPDATE public.resultado_indicadores SET pais = 'Lituania' WHERE pais = 'Lithuania';

UPDATE public.resultado_indicadores SET pais = 'Luxemburgo' WHERE pais = 'Luxembourg';

UPDATE public.resultado_indicadores SET pais = 'Eslovenia' WHERE pais = 'Slovenia';

UPDATE public.resultado_indicadores SET pais = 'Eslovaquia' WHERE pais = 'Slovakia';

UPDATE public.resultado_indicadores SET pais = 'Macedonia del Norte' WHERE pais = 'North Macedonia';

UPDATE public.resultado_indicadores SET pais = 'Bosnia y Herzegovina' WHERE pais = 'Bosnia and Herzegovina';

UPDATE public.resultado_indicadores SET pais = 'Chipre' WHERE pais = 'Cyprus';

UPDATE public.resultado_indicadores SET pais = 'Islandia' WHERE pais = 'Iceland';

UPDATE public.resultado_indicadores SET pais = 'Kosovo' WHERE pais = 'Kosovo*';

UPDATE public.resultado_indicadores SET pais = 'Unión Europea' WHERE pais = 'European Union';
