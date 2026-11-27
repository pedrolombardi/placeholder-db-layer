/**
 * Limites de custo das consultas na origem. Lidos do ambiente no boot (validados
 * em env.ts) e ajustaveis nos testes.
 *
 * - queryTimeoutMs: nenhuma consulta segura uma conexao por mais que isso; ao
 *   estourar, a API responde 504 QUERY_TIMEOUT em vez de travar.
 * - probeMaxRows: teto de linhas lidas pelos probes do diff e pelas tools de
 *   evidencia. Atingido o teto, o resultado vem marcado `sampled: true`.
 *   A validacao final do plano NAO usa teto: le a tabela inteira.
 */
export const limits = {
  queryTimeoutMs: Number(process.env.QUERY_TIMEOUT_MS ?? 15_000),
  probeMaxRows: Number(process.env.PROBE_MAX_ROWS ?? 200_000),
};
