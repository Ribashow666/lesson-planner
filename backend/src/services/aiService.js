const https = require('https');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `Você é um Assistente Pedagógico especializado em planejamento de aulas.
Seu papel é analisar o tema, disciplina e ementa de uma aula e sugerir conteúdos complementares relevantes.

Responda EXCLUSIVAMENTE com um objeto JSON válido, sem texto adicional, sem markdown, sem blocos de código.
O JSON deve seguir exatamente esta estrutura:
{
  "contents": "string com conteúdos complementares detalhados e organizados por tópicos",
  "support_resources": "string com recursos de apoio: livros, sites, vídeos, ferramentas",
  "tags": ["tag1", "tag2", "tag3"]
}

Regras:
- "contents": liste de 4 a 6 tópicos complementares com breve descrição de cada um
- "support_resources": indique de 3 a 5 recursos com nome e tipo (livro, site, vídeo, etc.)
- "tags": exatamente 3 tags curtas e relevantes para a aula (1 a 3 palavras cada)
- Responda sempre em português brasileiro
- Seja específico e prático, focado no contexto pedagógico`;

async function generateRecommendations({ title, discipline, summary }) {
  const startTime = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada');

  logger.info('AI Request initiated', { title, discipline, summaryLength: summary.length });

  const userMessage = `Título da Aula: ${title}
Disciplina: ${discipline}
Ementa/Resumo: ${summary}

Gere recomendações de conteúdos complementares, recursos de apoio e 3 tags para esta aula.`;

  const body = JSON.stringify({
    model: 'openrouter/free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const response = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:8080',
        'X-Title': 'Planejador de Aulas',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`OpenRouter error ${res.statusCode}: ${JSON.stringify(parsed).substring(0, 300)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });

  const latency = ((Date.now() - startTime) / 1000).toFixed(2);
  const tokenUsage = response.usage?.total_tokens || 0;

  logger.info('AI Request completed', { title, discipline, tokenUsage, latency: `${latency}s` });

  const rawText = response.choices?.[0]?.message?.content?.trim();
  if (!rawText) throw new Error('Resposta vazia da IA');

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_e) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI response could not be parsed as JSON');
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (!parsed.contents || !parsed.support_resources || !Array.isArray(parsed.tags)) {
    throw new Error('AI response missing required fields');
  }
  if (parsed.tags.length !== 3) parsed.tags = parsed.tags.slice(0, 3);

  return parsed;
}

module.exports = { generateRecommendations };
