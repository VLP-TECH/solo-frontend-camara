-- Tabla de base de conocimiento del chatbot (preguntas frecuentes y respuestas).
-- La búsqueda se hace por title y content (ILIKE); keywords mejora la relevancia.
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  title text NOT NULL,
  content text NOT NULL,
  keywords text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_title ON public.chatbot_knowledge USING btree (title text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_content ON public.chatbot_knowledge USING gin (to_tsvector('spanish', content));
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_category ON public.chatbot_knowledge (category);

COMMENT ON TABLE public.chatbot_knowledge IS 'Base de conocimiento del chatbot: preguntas y respuestas para búsqueda por términos.';

-- Si la tabla ya existía sin keywords, añadir la columna
ALTER TABLE public.chatbot_knowledge ADD COLUMN IF NOT EXISTS keywords text[];
