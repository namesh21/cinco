// Motor da Calculadora de PGBL (declaração 2027, ano-calendário 2026). Sem dependências externas.
import { inssEmpregado } from './pjclt.js';

export const PGBL = {
  limitePct: 0.12,
  tabelaAnual: [
    [29145.6, 0, 0],
    [33919.8, 0.075, 2185.92],
    [45012.6, 0.15, 4729.91],
    [55976.16, 0.225, 8105.85],
    [Infinity, 0.275, 10904.66],
  ],
  reducao: { ate: 60000, max: 2694.15, limite: 88200, a: 8429.73, b: 0.095575 },
  simplificado: { pct: 0.2, teto: 17640 },
  dependente: 2275.08,
  educacaoPorPessoa: 3561.5,
  isenta65Mensal: 1903.98, // aposentadoria/pensão de quem tem 65+ (13º tem parcela própria, fora do ajuste)
  regressiva: [[2, 0.35], [4, 0.3], [6, 0.25], [8, 0.2], [10, 0.15], [Infinity, 0.1]],
  irAplicacao: 0.15, // renda fixa e fundos acima de 720 dias
  comeCotas: 0.15, // fundos de longo prazo, semestral
};
const r2 = (v) => Math.round(v * 100) / 100;
const n = (v) => (Number.isFinite(v) ? v : 0);

/** IR anual pela tabela progressiva, com a redução da Lei 15.270/2025 */
export function irAnual(base, rendaTributavel) {
  const f = PGBL.tabelaAnual.find(([lim]) => base <= lim);
  let ir = Math.max(0, base * f[1] - f[2]);
  const R = PGBL.reducao;
  if (rendaTributavel <= R.ate) ir -= Math.min(ir, R.max);
  else if (rendaTributavel <= R.limite) ir -= Math.min(ir, Math.max(0, R.a - R.b * rendaTributavel));
  return r2(Math.max(0, ir));
}

/** meses com parcela isenta de 65+: situacao = 'menor65' | '65' | 'm2'..'m12' (mês em que completa 65) | 'grave' */
function mesesIsencao65(situacao) {
  if (situacao === '65') return 12;
  const m = /^m(\d{1,2})$/.exec(situacao || '');
  return m ? Math.max(0, 13 - Number(m[1])) : 0;
}

/**
 * i = { salarioMensal, rendaAnualInformada, outrasRendas, aposentadoria, situacao, inssAnual?, contribuiINSS,
 *       dependentes, saude, educacao, pensao, pgblAtual, pctAporte (0..1), irRetido? }
 */
export function calcularPGBL(i) {
  const salario = n(i.salarioMensal);
  const informada = n(i.rendaAnualInformada);
  // trabalho: valor do informe (linha 1 do quadro 3) ou 12 salários + 1/3 de férias. 13º e PLR ficam fora.
  const rendaTrabalho = informada > 0 ? informada : salario * 12 + salario / 3;
  const apos = n(i.aposentadoria);
  const isentaApos = i.situacao === 'grave' ? apos : Math.min(apos, PGBL.isenta65Mensal * mesesIsencao65(i.situacao));
  const renda = r2(rendaTrabalho + n(i.outrasRendas) + apos - isentaApos);

  const salarioRef = informada > 0 ? informada / (12 + 1 / 3) : salario;
  const inss = i.inssAnual != null && Number.isFinite(i.inssAnual)
    ? i.inssAnual
    : salarioRef > 0 ? r2(inssEmpregado(salarioRef) * 11 + inssEmpregado(salarioRef * (4 / 3))) : 0;

  const pessoas = 1 + n(i.dependentes);
  const educ = Math.min(n(i.educacao), PGBL.educacaoPorPessoa * pessoas);
  const deducoesSemPGBL = r2(inss + n(i.dependentes) * PGBL.dependente + n(i.saude) + educ + n(i.pensao));

  const limite = r2(renda * PGBL.limitePct);
  const podeDeduzir = !!i.contribuiINSS && renda > 0;
  const pct = Math.min(1, Math.max(0, i.pctAporte == null ? 1 : i.pctAporte));
  const pgblAtual = Math.min(n(i.pgblAtual), limite);
  const alvo = Math.max(pgblAtual, r2(limite * pct)); // total de PGBL no ano após a simulação
  const aporteFaltante = podeDeduzir ? r2(Math.max(0, alvo - pgblAtual)) : 0;

  const descSimpl = r2(Math.min(renda * PGBL.simplificado.pct, PGBL.simplificado.teto));
  const irSimplificado = irAnual(Math.max(0, renda - descSimpl), renda);
  const irCompletoSemPGBL = irAnual(Math.max(0, renda - deducoesSemPGBL), renda);
  const irCompletoAtual = irAnual(Math.max(0, renda - deducoesSemPGBL - (podeDeduzir ? pgblAtual : 0)), renda);
  const irCompletoAlvo = irAnual(Math.max(0, renda - deducoesSemPGBL - (podeDeduzir ? alvo : 0)), renda);

  const irHoje = Math.min(irSimplificado, irCompletoAtual);
  const irComAporte = Math.min(irSimplificado, irCompletoAlvo);
  const modeloHoje = irSimplificado <= irCompletoAtual ? 'simplificado' : 'completo';
  const modeloComAporte = irSimplificado <= irCompletoAlvo ? 'simplificado' : 'completo';
  const economia = podeDeduzir ? r2(Math.max(0, irHoje - irComAporte)) : 0;
  const economiaTotal = podeDeduzir ? r2(Math.max(0, Math.min(irSimplificado, irCompletoSemPGBL) - irComAporte)) : 0;

  const retido = i.irRetido != null && Number.isFinite(i.irRetido) ? i.irRetido : null;
  return {
    renda, rendaTrabalho: r2(rendaTrabalho), isentaApos: r2(isentaApos), inss, deducoesSemPGBL,
    limite, limiteMensal: r2(limite / 12), podeDeduzir, pct, alvo,
    descSimpl, irSimplificado, irCompletoSemPGBL, irCompletoAtual, irCompletoAlvo,
    irHoje, irComAporte, modeloHoje, modeloComAporte, economia, economiaTotal,
    aporteFaltante, aporteFaltanteMensal: r2(aporteFaltante / 12),
    retornoFiscal: aporteFaltante > 0 ? economia / aporteFaltante : 0,
    restituicaoSem: retido == null ? null : r2(retido - irHoje),
    restituicaoCom: retido == null ? null : r2(retido - irComAporte),
  };
}

const aliqRegressiva = (anos) => PGBL.regressiva.find(([lim]) => anos < lim)[1];

/** Valor líquido de um aporte numa aplicação comum após `anos`. tipo: 'fim' (CDB/Tesouro) ou 'comecotas' (fundo) */
function aplicacaoComum(valor, anos, r, tipo) {
  if (anos <= 0) return valor;
  if (tipo === 'comecotas') {
    let bal = valor, base = valor;
    const semestres = Math.round(anos * 2);
    const rs = Math.pow(1 + r, 0.5) - 1;
    for (let s = 0; s < semestres; s++) {
      bal *= 1 + rs;
      const ganho = bal - base;
      if (ganho > 0) { bal -= ganho * PGBL.comeCotas; base = bal; }
    }
    return bal; // alíquota final de 15% já recolhida pelo come-cotas
  }
  const fv = valor * Math.pow(1 + r, anos);
  return fv - Math.max(0, fv - valor) * PGBL.irAplicacao;
}

/**
 * Projeção com o mesmo dinheiro saindo do bolso a cada ano (aporteAnual).
 * - PGBL: rende (r - taxa); IR regressivo sobre o TOTAL de cada aporte, pela idade dele; a economia de IR
 *   de cada ano é reinvestida na aplicação comum escolhida.
 * - VGBL: mesma rentabilidade e taxa do plano; IR regressivo só sobre o ganho de cada aporte; sem benefício fiscal.
 * - Aplicação comum: CDB/Tesouro (15% no fim) ou fundo com come-cotas.
 * espera = anos entre o último aporte e o resgate.
 */
export function projetar({ aporteAnual, economiaAnual, anos, rentab, taxaAdm, espera = 0, tipoAlt = 'fim' }) {
  const rp = Math.max(-0.99, rentab - taxaAdm);
  const o = { pgblBruto: 0, pgblIR: 0, reinvest: 0, vgblIR: 0, alt: 0, aportado: 0 };
  for (let k = 0; k < anos; k++) {
    const idade = anos - k + espera;
    const fv = aporteAnual * Math.pow(1 + rp, idade);
    const aliq = aliqRegressiva(idade);
    o.pgblBruto += fv;
    o.pgblIR += fv * aliq;
    o.vgblIR += Math.max(0, fv - aporteAnual) * aliq;
    o.reinvest += aplicacaoComum(economiaAnual, idade - 1, rentab, tipoAlt); // restituição chega no ano seguinte
    o.alt += aplicacaoComum(aporteAnual, idade, rentab, tipoAlt);
    o.aportado += aporteAnual;
  }
  const pgblLiq = o.pgblBruto - o.pgblIR;
  const totalPGBL = pgblLiq + o.reinvest;
  const vgblLiq = o.pgblBruto - o.vgblIR;
  const melhorOutro = Math.max(vgblLiq, o.alt);
  return {
    aportado: r2(o.aportado), pgblBruto: r2(o.pgblBruto), pgblIR: r2(o.pgblIR), pgblLiq: r2(pgblLiq),
    reinvestLiq: r2(o.reinvest), totalPGBL: r2(totalPGBL),
    vgblBruto: r2(o.pgblBruto), vgblIR: r2(o.vgblIR), vgblLiq: r2(vgblLiq),
    altLiq: r2(o.alt),
    vencedor: totalPGBL >= melhorOutro ? 'PGBL' : vgblLiq >= o.alt ? 'VGBL' : 'aplicação comum',
    diferenca: r2(totalPGBL - melhorOutro),
  };
}

/** Menor nº de anos de aportes a partir do qual o PGBL supera VGBL e aplicação comum (null se não supera até 40) */
export function pontoDeVirada(params) {
  if (!(params.aporteAnual > 0) || !(params.economiaAnual > 0)) return null;
  for (let a = 1; a <= 40; a++) {
    if (projetar({ ...params, anos: a }).vencedor === 'PGBL') return a;
  }
  return null;
}
