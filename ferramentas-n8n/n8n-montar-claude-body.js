const dados = $input.all().map((i) => i.json);

const prompt = `
Você é um analista sênior de Meta Ads.

Analise as campanhas e retorne APENAS JSON VÁLIDO (sem markdown).

Cada campanha em DADOS já traz "metricas": array com { nome, valor, formato } vindos da Meta.
NÃO invente métricas. NÃO remova métricas. NÃO renomeie métricas — use os mesmos "nome" de DADOS.
Pode acrescentar score, status, pontos_fortes, pontos_fracos, recomendacoes com base nos valores reais.

FORMATO:

{
  "kpis": {
    "metricas_resumo": [
      { "nome": string, "valor": number, "formato": "moeda" | "numero" | "percentual" | "decimal" }
    ],
    "melhor_campanha": string
  },
  "campanhas": [
    {
      "nome": string,
      "objetivo": string | null,
      "metricas": [ { "nome": string, "valor": number, "formato": string } ],
      "score": number,
      "status": "Excelente" | "Boa" | "Atenção" | "Crítica",
      "pontos_fortes": [string],
      "pontos_fracos": [string],
      "recomendacoes": [string],
      "criativos": [ { "nome": string, "ad_id": string, "thumbnail_url": string, "status": string } ]
    }
  ],
  "insights_gerais": [string],
  "acoes_recomendadas": [string]
}

REGRAS:
- metricas_resumo = soma/agregação lógica das metricas de todas as campanhas (mesmos nomes quando fizer sentido)
- Em cada campanha, copie o array "metricas" integralmente de DADOS
- MAXIMO 2 bullets em pontos_fortes, pontos_fracos, recomendacoes
- MAXIMO 3 itens em insights_gerais e acoes_recomendadas

DADOS:
${JSON.stringify(
  dados.map((d) => ({
    nome: d.nome || d.campanha,
    objetivo: d.objetivo,
    metricas: d.metricas || [],
    criativos: (d.criativos || []).map((c) => ({
      nome: c.nome,
      ad_id: c.ad_id,
      status: c.status,
      thumbnail_url: c.thumbnail_url,
    })),
  }))
)}
`;

return [
  {
    json: {
      claudeBody: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      },
    },
  },
];
