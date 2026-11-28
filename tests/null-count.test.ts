import { describe, expect, it } from 'vitest';
import type { PlannedColumn } from '../src/plan/model';
import { toBind } from '../src/plan/validate';

const col = (onInvalid: PlannedColumn['onInvalid']): PlannedColumn => ({
  name: 'criado_em',
  rawName: 'CRIADO_EM',
  type: 'TIMESTAMP(6)',
  base: 'TIMESTAMP',
  length: null,
  semantics: null,
  precision: 6,
  scale: null,
  nullable: true,
  changedFrom: null,
  onInvalid,
  autoIncrement: false,
  source: null,
  conflict: null,
});

describe('contagem de nulos esperados na carga do sandbox', () => {
  it('data zero convertida em NULL conta como nulo esperado', () => {
    const converted = { n: 0 };
    expect(toBind(col({ kind: 'null' }), '0000-00-00 00:00:00', converted)).toBeNull();
    expect(converted.n).toBe(1);
  });

  it('data zero convertida em data padrao vira valor e nao conta como nulo', () => {
    const converted = { n: 0 };
    expect(toBind(col({ kind: 'default', value: '1970-01-01' }), '0000-00-00 00:00:00', converted)).toBe('1970-01-01 00:00:00');
    expect(converted.n).toBe(0);
  });
});
