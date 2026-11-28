// Motor da Calculadora de PGBL (declaração 2027, ano-calendário 2026). Sem dependências.
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
  regressiva: [[2, 0.35], [4, 0.3], [6, 0.25], [8, 0.2], [10, 0.15], [Infinity, 0.1]],
  irAplicacaoLonga: 0.15, // renda fixa/fundos acima de 720 dias
};
const r2 = (v) => Math.round(v * 100) / 100;

/** IR anual pela tabela progressiva, já com a redução da Lei 15.270/2025 */
export function irAnual(base, rendaTributavel) {
  const f = PGBL.tabelaAnual.find(([lim]) => base <= lim);
  let ir = Math.max(0, base * f[1] - f[2]);
  const R = PGBL.reducao;
  if (rendaTributavel <= R.ate) ir -= Math.min(ir, R.max);
  else if (rendaTributavel <= R.limite) ir -= Math.min(ir, Math.max(0, R.a - R.b * rendaTributavel));
  return r2(Math.max(0, ir));
}

/**
 * i = { salarioMensal, outrasRendas, inssAnual?, contribuiINSS, dependentes, saude, educacao, pensao, pgblAtual }
 */
export function calcularPGBL(i) {
  const salario = i.salarioMensal || 0;
  // rendimentos tributáveis da declaração: 12 salários + 1/3 de férias (13º é tributação exclusiva)
  const renda = r2(salario * 12 + salario / 3 + (i.outrasRendas || 0));
  const inss = i.inssAnual != null && i.inssAnual !== '' && !Number.isNaN(i.inssAnual)
    ? i.inssAnual
    : r2(inssEmpregado(salario) * 11 + inssEmpregado(salario * (4 / 3)));
  const pessoas = 1 + (i.dependentes || 0);
  const educ = Math.min(i.educacao || 0, PGBL.educacaoPorPessoa * pessoas);
  const deducoesSemPGBL = r2(inss + (i.dependentes || 0) * PGBL.dependente + (i.saude || 0) + educ + (i.pensao || 0));

  const limite = r2(renda * PGBL.limitePct);
  const podeDeduzir = !!i.contribuiINSS && renda > 0;
  const pgblAtual = Math.min(i.pgblAtual || 0, limite);

  const descSimpl = r2(Math.min(renda * PGBL.simplificado.pct, PGBL.simplificado.teto));
  const irSimplificado = irAnual(Math.max(0, renda - descSimpl), renda);
  const irCompletoAtual = irAnual(Math.max(0, renda - deducoesSemPGBL - (podeDeduzir ? pgblAtual : 0)), renda);
  const irCompletoMax = irAnual(Math.max(0, renda - deducoesSemPGBL - (podeDeduzir ? limite : 0)), renda);

  const irCompletoSemPGBL = irAnual(Math.max(0, renda - deducoesSemPGBL), renda);
  const economiaTotal = podeDeduzir ? r2(Math.max(0, Math.min(irSimplificado, irCompletoSemPGBL) - irCompletoMax)) : 0;
  const irHoje = Math.min(irSimplificado, irCompletoAtual);
  const modeloHoje = irSimplificado <= irCompletoAtual ? 'simplificado' : 'completo';
  const economia = podeDeduzir ? r2(Math.max(0, irHoje - irCompletoMax)) : 0;
  const aporteFaltante = podeDeduzir ? r2(Math.max(0, limite - pgblAtual)) : 0;

  return {
    renda, inss, deducoesSemPGBL, limite, limiteMensal: r2(limite / 12), podeDeduzir,
    irSimplificado, irCompletoAtual, irCompletoMax, irHoje, modeloHoje, economia,
    economiaTotal, aporteFaltante, aporteFaltanteMensal: r2(aporteFaltante / 12),
    retornoFiscal: aporteFaltante > 0 ? economia / aporteFaltante : 0,
    compensa: economia > 0 && podeDeduzir,
  };
}

const aliquotaRegressiva = (anos) => PGBL.regressiva.find(([lim]) => anos < lim)[1];

/**
 * Projeção: mesmo dinheiro saindo do bolso por ano (aporte).
 * PGBL: aporte rende (r - taxaAdm); a economia de IR de cada ano é reinvestida numa aplicação comum.
 * No resgate, IR da tabela regressiva sobre o valor total de cada aporte, conforme a idade do aporte.
 * Alternativa: o mesmo aporte numa aplicação comum, IR de 15% só sobre o ganho.
 */
export function projetar({ aporteAnual, economiaAnual, anos, rentab, taxaAdm, espera = 0 }) {
  // espera: anos entre o último aporte e o resgate (o dinheiro continua rendendo)
  const rp = Math.max(-0.99, rentab - taxaAdm);
  let pgblBruto = 0, pgblIR = 0, reinvest = 0, reinvestAportado = 0, alt = 0, altAportado = 0;
  for (let k = 0; k < anos; k++) {
    const idade = anos - k + espera; // aporte feito no início do ano k
    const vfPgbl = aporteAnual * Math.pow(1 + rp, idade);
    pgblBruto += vfPgbl;
    pgblIR += vfPgbl * aliquotaRegressiva(idade);
    // restituição chega no ano seguinte ao aporte
    if (idade - 1 > 0) {
      reinvest += economiaAnual * Math.pow(1 + rentab, idade - 1);
      reinvestAportado += economiaAnual;
    }
    alt += aporteAnual * Math.pow(1 + rentab, idade);
    altAportado += aporteAnual;
  }
  const reinvestLiq = reinvest - Math.max(0, reinvest - reinvestAportado) * PGBL.irAplicacaoLonga;
  const altLiq = alt - Math.max(0, alt - altAportado) * PGBL.irAplicacaoLonga;
  const pgblLiq = pgblBruto - pgblIR;
  return {
    pgblBruto: r2(pgblBruto), pgblIR: r2(pgblIR), pgblLiq: r2(pgblLiq),
    reinvestLiq: r2(reinvestLiq), totalPGBL: r2(pgblLiq + reinvestLiq),
    altBruto: r2(alt), altLiq: r2(altLiq), diferenca: r2(pgblLiq + reinvestLiq - altLiq),
    aportado: r2(altAportado),
  };
}
