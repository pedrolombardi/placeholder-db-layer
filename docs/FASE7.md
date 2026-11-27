# DB Layer — contribuição da Fase 7

Pedro Lombardi — RM 99598. Branch `fase7-db-layer`, a partir da `main` da Fase 6 (`5ffd413`).

## O que mudou e por quê

| # | Entrega | Por quê | Onde |
|---|---|---|---|
| 1 | **Dependências sem vulnerabilidades conhecidas**: zod 3 → 4, vitest 2 → 4, express/body-parser/qs e @typescript-eslint atualizados | A validação integrada do Erick (17/11) registrou 20 vulnerabilidades no build do DB Layer; o `npm audit` de 27/11 mediu 17 (2 críticas, 5 altas), 3 delas em produção | `package.json`, `package-lock.json` |
| 2 | **Um sandbox por migração**: cada validação cria tabelas próprias no schema SANDBOX (prefixo derivado do `datasetId`) e as apaga no fim. A fila global de validações saiu | Na Fase 6 as tabelas do sandbox tinham nomes fixos: validações simultâneas eram serializadas e, sem a fila, leriam o dado uma da outra | `src/plan/model.ts` (`sandboxPrefix`, `sandboxTable`), `src/plan/validate.ts`, `src/routes/plan.ts` |
| 3 | **Limite de tempo em toda consulta** (`QUERY_TIMEOUT_MS`, padrão 15 s): MySQL `timeout` e Oracle `callTimeout`; estouro vira **504** `QUERY_TIMEOUT` | Uma consulta lenta na origem de um cliente não pode segurar conexões nem travar a API | `src/config/limits.ts`, adaptadores, `src/http.ts` |
| 4 | **Teto de linhas** (`PROBE_MAX_ROWS`, padrão 200 mil) nos probes do diff e nas tools; resposta marcada `sampled: true` e aviso no diff | Ler a tabela inteira em produção inviabiliza tabelas grandes; o resultado parcial fica explícito, nunca silencioso. A validação final do plano continua lendo tudo | `src/schema/dialect.ts` (`cappedSource`), `src/schema/probes.ts`, `src/tools/tools.ts`, `src/schema/diff.ts` |
| 5 | **Regra nova: texto vazio vira NULL no Oracle**. Destino `NOT NULL` com `''` na origem → julgamento `EMPTY_STRING_NOT_NULL`; destino que aceita NULL → mecânico com aviso. A validação mede o fato na origem e o sandbox reproduz o comportamento | O Oracle não distingue `''` de NULL: a carga falharia, ou o dado mudaria de significado em silêncio | `src/schema/classify.ts`, `src/schema/probes.ts`, `src/plan/validate.ts` |

Contratos **preservados**: nenhum campo removido. Campos novos e aditivos: `sampled` (tools e
probes), `datasetId` opcional em `/validate/plan`, e `sandbox.prefix`, `sandbox.tables` e
`sandbox.dropped` na resposta da validação. Código de erro novo: `QUERY_TIMEOUT` (504).

## Testes

**50 testes** ([saída](evidencias/fase7/testes.txt)), 7 novos nesta fase:
- prefixo do sandbox (determinístico, distinto entre execuções, identificador Oracle válido);
- teto de linhas e `sampled`;
- timeout virando 504;
- regra do texto vazio (4 cenários).

Lint e typecheck limpos.

## Validação integrada (27/11/2026, bancos reais)

Plataforma completa (`placeholder-platform`), com este DB Layer e a **AI Layer da Fase 7 do Erick**
(PR #2, branch `ErickGruber/fase7-ai-layer`):

| Verificação | Resultado | Evidência |
|---|---|---|
| e2e da plataforma (análise → homologação → sandbox → validação → script) | ✅ `E2E OK` | [e2e-plataforma.txt](evidencias/fase7/e2e-plataforma.txt) |
| Contrato com a AI Layer nova: `database`, `table`, `column` e `simulated` em `OK` e `NO_DATA` | ✅ nas 3 tools | [verificacoes-fase7.txt](evidencias/fase7/verificacoes-fase7.txt) |
| 1ª chamada de tool depois de reiniciar o DB Layer (a AI Layer corta em 1000 ms) | ✅ ~0,5 s; depois ~0,24 s | idem |
| Duas execuções simultâneas pelo Core | ✅ as duas COMPLETED, 5/5 verificações cada | idem |
| Validações simultâneas usam tabelas diferentes e as apagam | ✅ prefixos `S964C8B06` × `S6ED41A4A`; 0 tabelas restantes no SANDBOX | [sandbox-paralelo.json](evidencias/fase7/sandbox-paralelo.json) |
| `npm audit` | ✅ 17 → 0 (produção 3 → 0) | [antes](evidencias/fase7/npm-audit-antes.json) · [depois](evidencias/fase7/npm-audit-depois.json) |

Observação: o Core guarda só as verificações da validação, não o bloco `sandbox`. Por isso os
prefixos foram conferidos chamando o DB Layer diretamente.

## Limites e pendências

- **Fica para depois da Fase 7:** credenciais por migração (conectar no banco informado na tela),
  execução assistida do script no destino e autenticação entre serviços. Ver
  [ROADMAP.md](ROADMAP.md).
- **Amostra:** o teto de linhas lê as primeiras linhas, não uma amostra estatisticamente
  representativa.
- **Banco de demonstração:** o seed não tem texto vazio, então a regra nova é coberta por testes
  unitários, não pelo e2e.
