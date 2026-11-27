import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { limits } from '../src/config/limits';
import { Registry } from '../src/db/registry';
import { DbAdapter, DbLayerError, QueryResult } from '../src/db/types';
import { Deps } from '../src/deps';
import { sqlProbeRunner } from '../src/schema/probes';
import { NormSchema, findTable } from '../src/schema/types';
import seed from './fixtures/seed-schema.json';

const source = seed.source as NormSchema;
const target = seed.target as NormSchema;
const original = { ...limits };
afterEach(() => Object.assign(limits, original));

function adapter(answer: (sql: string) => QueryResult, queries: string[] = []): DbAdapter {
  return {
    engine: 'mysql', role: 'source', schema: 'vendas',
    connect: async () => {}, close: async () => {},
    info: async () => { throw new Error('nao usado'); },
    query: async (sql) => { queries.push(sql); return answer(sql); },
  };
}

describe('teto de linhas nas consultas de analise (PROBE_MAX_ROWS)', () => {
  it('probes leem no maximo o teto e marcam sampled quando ele e atingido', async () => {
    limits.probeMaxRows = 5;
    const queries: string[] = [];
    const db = adapter(() => ({ rows: [{ total: '5', z0: '0' }], rowCount: 1 }), queries);
    const pedidos = findTable(source, 'pedidos')!;
    const out = await sqlProbeRunner(db).run(pedidos, new Map([['criado_em', { zeroDate: true }]]));
    expect(queries[0]).toContain('FROM (SELECT * FROM `pedidos` LIMIT 5) `amostra`');
    expect(out.get('criado_em')).toMatchObject({ totalRows: 5, sampled: true });
  });

  it('abaixo do teto nao marca sampled', async () => {
    limits.probeMaxRows = 1000;
    const db = adapter(() => ({ rows: [{ total: '6', z0: '2' }], rowCount: 1 }));
    const out = await sqlProbeRunner(db).run(findTable(source, 'pedidos')!, new Map([['criado_em', { zeroDate: true }]]));
    expect(out.get('criado_em')?.sampled).toBeUndefined();
  });
});

describe('limite de tempo das consultas (QUERY_TIMEOUT_MS)', () => {
  it('consulta que estoura o tempo vira 504 QUERY_TIMEOUT, sem travar a API', async () => {
    const slow = adapter(() => { throw new DbLayerError('QUERY_TIMEOUT', 'MySQL: consulta passou de 15000 ms'); });
    const registry: Registry = {
      source: slow,
      target: { ...slow, engine: 'oracle', role: 'target' },
      connectAll: async () => {}, closeAll: async () => {},
    };
    const deps: Deps = {
      introspect: async (a) => (a.role === 'source' ? source : target),
      probeRunner: () => ({ run: async () => new Map() }),
    };
    const res = await request(createApp(registry, deps))
      .post('/tools/profile-column')
      .send({ database: 'mysql', table: 'clientes', column: 'email' });
    expect(res.status).toBe(504);
    expect(res.body.code).toBe('QUERY_TIMEOUT');
  });
});
