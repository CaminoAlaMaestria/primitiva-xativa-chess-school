CREATE TABLE public.diagram_positions (
  key text PRIMARY KEY,
  fen text NOT NULL,
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagram_positions TO anon, authenticated;
GRANT ALL ON public.diagram_positions TO service_role;
ALTER TABLE public.diagram_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON public.diagram_positions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Escritura pública" ON public.diagram_positions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Edición pública" ON public.diagram_positions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Borrado público" ON public.diagram_positions FOR DELETE TO anon, authenticated USING (true);