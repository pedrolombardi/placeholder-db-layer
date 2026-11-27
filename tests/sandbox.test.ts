import { describe, it, expect } from 'vitest';
import { sandboxPrefix, sandboxTable } from '../src/plan/model';

/** Cada validacao tem as proprias tabelas no SANDBOX: validacoes em paralelo nao se misturam. */
describe('sandbox por migracao', () => {
  it('prefixo deterministico por execucao e distinto entre execucoes', () => {
    const a = sandboxPrefix('run-a');
    expect(sandboxPrefix('run-a')).toBe(a);
    expect(sandboxPrefix('run-b')).not.toBe(a);
  });

  it('gera identificador Oracle valido, mesmo para chaves estranhas', () => {
    const p = sandboxPrefix('"; DROP TABLE CLIENTES; --');
    expect(p).toMatch(/^S[0-9A-F]{8}$/);
    expect(sandboxTable(p, 'CLIENTES')).toBe(`${p}_CLIENTES`);
    expect(sandboxTable(p, 'X'.repeat(200))).toHaveLength(128);
  });
});
