-- RespostaOcai: capture respondent demographics at the moment of submission
-- Stored separately from Pessoa/Cargo (snapshot — not a live FK)
ALTER TABLE "RespostaOcai" ADD COLUMN IF NOT EXISTS "cargoSnapshot"  TEXT;
ALTER TABLE "RespostaOcai" ADD COLUMN IF NOT EXISTS "areaSnapshot"   TEXT;
ALTER TABLE "RespostaOcai" ADD COLUMN IF NOT EXISTS "tempoEmpresa"   TEXT; -- e.g. "<1 ano", "1-3 anos", "3-5 anos", ">5 anos"
