/* Nó Code: Filtrar campanhas (objetivo) — só ACTIVE, sem lista fixa */
const listaSource = $('📋 Lista Destaque Odonto').first().json;
const res = $input.first().json;

const todas = Array.isArray(res.data) ? res.data : [];

function campanhaAtiva(c) {
  const st = String(c.effective_status || c.status || '').toUpperCase();
  return st === 'ACTIVE';
}

const campanhas = todas.filter(campanhaAtiva);
const body = listaSource.body || {};
const objetivoFiltro = body.objetivo_campanha || null;

const filtradas = objetivoFiltro
  ? campanhas.filter((c) => String(c.objective || '') === String(objetivoFiltro))
  : campanhas;

const idsFiltradas = filtradas
  .map((c) => (c.id != null ? String(c.id) : null))
  .filter(Boolean);

const objetivos_por_campanha = {};
for (const c of campanhas) {
  if (c?.id != null && c.objective) {
    objetivos_por_campanha[String(c.id)] = String(c.objective);
  }
}

const cliente = { ...listaSource.cliente, objetivos_por_campanha };

return [
  {
    json: {
      cliente,
      body,
      campaign_ids_filtradas: idsFiltradas,
      total_campanhas_ativas: campanhas.length,
      total_campanhas_conta: todas.length,
    },
  },
];
