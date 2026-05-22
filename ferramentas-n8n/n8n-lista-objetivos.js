/* Nó Code: 📤 Montar lista objetivos — 100% dinâmico da Meta, só campanhas ACTIVE */
const res = $input.first()?.json ?? {};
const todas = Array.isArray(res.data) ? res.data : [];

function campanhaAtiva(c) {
  const st = String(c.effective_status || c.status || '').toUpperCase();
  return st === 'ACTIVE';
}

const ativas = todas.filter(campanhaAtiva);
const semObjetivo = ativas.filter((c) => !c.objective).length;

const porObjetivo = {};
for (const c of ativas) {
  const value = c.objective ? String(c.objective) : null;
  if (!value) continue;
  if (!porObjetivo[value]) {
    porObjetivo[value] = { value, campanhas: 0, nomes: [] };
  }
  porObjetivo[value].campanhas += 1;
  if (c.name) porObjetivo[value].nomes.push(String(c.name));
}

const objetivos = Object.values(porObjetivo)
  .sort((a, b) => b.campanhas - a.campanhas)
  .map((o) => {
    const exemplo = o.nomes.slice(0, 2).join(' · ');
    const label = exemplo
      ? `${o.value} — ${exemplo}`
      : `${o.value} (${o.campanhas} ativa${o.campanhas > 1 ? 's' : ''})`;
    return {
      value: o.value,
      label,
      campanhas: o.campanhas,
      campanhas_nomes: o.nomes,
    };
  });

return [
  {
    json: {
      tipo: 'objetivos',
      objetivos,
      atualizado_em: new Date().toISOString(),
      total_campanhas_ativas: ativas.length,
      total_objetivos_distintos: objetivos.length,
      campanhas_sem_objetivo: semObjetivo,
      total_campanhas_conta: todas.length,
      fonte: 'meta_api',
    },
  },
];
