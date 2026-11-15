DROP POLICY IF EXISTS "Borrado público" ON public.diagram_positions;
DROP POLICY IF EXISTS "Edición pública" ON public.diagram_positions;
DROP POLICY IF EXISTS "Escritura pública" ON public.diagram_positions;
DROP POLICY IF EXISTS "Lectura pública" ON public.diagram_positions;

CREATE POLICY "Lectura de diagramas de la clase" ON public.diagram_positions FOR SELECT TO anon, authenticated
USING (key ~ '^[A-Z][0-9]{1,3}$');

CREATE POLICY "Guardar diagramas válidos" ON public.diagram_positions FOR INSERT TO anon, authenticated
WITH CHECK (key ~ '^[A-Z][0-9]{1,3}$' AND char_length(fen) BETWEEN 15 AND 100 AND jsonb_typeof(moves) = 'array' AND jsonb_array_length(moves) <= 300);

CREATE POLICY "Editar diagramas válidos" ON public.diagram_positions FOR UPDATE TO anon, authenticated
USING (key ~ '^[A-Z][0-9]{1,3}$')
WITH CHECK (key ~ '^[A-Z][0-9]{1,3}$' AND char_length(fen) BETWEEN 15 AND 100 AND jsonb_typeof(moves) = 'array' AND jsonb_array_length(moves) <= 300);

CREATE POLICY "Restablecer diagramas de la clase" ON public.diagram_positions FOR DELETE TO anon, authenticated
USING (key ~ '^[A-Z][0-9]{1,3}$');