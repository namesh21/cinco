// Motor da calculadora "Quanto devo cobrar como PJ" (valores de 2026, válidos para 2027 no Simples Nacional).
// Sem dependências: usado pela página (navegador) e por testes em Node.

export const PARAMS = {
  salarioMinimo: 1621.0,
  inss: { faixas: [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]], teto: 8475.55 },
  inssContribuinte: 0.11, // pró-labore: 11% até o teto
  ir: {
    // tabela progressiva mensal (vigente desde maio/2025, mantida em 2026)
    faixas: [
      [2428.8, 0, 0],
      [2826.65, 0.075, 182.16],
      [3751.05, 0.15, 394.16],
      [4664.68, 0.225, 675.49],
      [Infinity, 0.275, 908.73],
    ],
    descontoSimplificado: 607.2,
    dependente: 189.59,
    // Lei 15.270/2025: redução mensal
    reducaoAte5000: 312.89,
    reducaoA: 978.62,
    reducaoB: 0.133145,
    limiteReducao: 7350.0,
  },
  fgts: 0.08,
  // Simples Nacional: [limite RBT12, alíquota nominal, parcela a deduzir]
  anexoIII: [[180000, 0.06, 0], [360000, 0.112, 9360], [720000, 0.135, 17640], [1800000, 0.16, 35640], [3600000, 0.21, 125640], [4800000, 0.33, 648000]],
  anexoV: [[180000, 0.155, 0], [360000, 0.18, 4500], [720000, 0.195, 9900], [1800000, 0.205, 17100], [3600000, 0.23, 62100], [4800000, 0.305, 540000]],
  fatorR: 0.28,
  dividendos: { limiteMensal: 50000, aliquota: 0.1 },
};

const P = PARAMS;
const r2 = (v) => Math.round(v * 100) / 100;

export function inssEmpregado(bruto) {
  let total = 0, prev = 0;
  for (const [lim, a] of P.inss.faixas) {
    if (bruto <= prev) break;
    total += (Math.min(bruto, lim) - prev) * a;
    prev = lim;
  }
  return r2(total);
}

export const inssProLabore = (pl) => r2(Math.min(pl, P.inss.teto) * P.inssContribuinte);

/** IRRF mensal com a redução da Lei 15.270/2025. bruto = rendimento tributável do mês. */
export function irrf(bruto, inss, dependentes = 0) {
  const ded = Math.max(inss + dependentes * P.ir.dependente, P.ir.descontoSimplificado);
  const base = Math.max(0, bruto - ded);
  const f = P.ir.faixas.find(([lim]) => base <= lim);
  let imposto = Math.max(0, base * f[1] - f[2]);
  if (bruto <= 5000) imposto = Math.max(0, imposto - Math.min(imposto, P.ir.reducaoAte5000));
  else if (bruto <= P.ir.limiteReducao) imposto = Math.max(0, imposto - Math.max(0, P.ir.reducaoA - P.ir.reducaoB * bruto));
  return r2(imposto);
}

/** Líquido de um pagamento CLT tributado como mês normal */
function liquidoMes(bruto, dependentes) {
  const inss = inssEmpregado(bruto);
  const ir = irrf(bruto, inss, dependentes);
  return { bruto, inss, ir, liquido: r2(bruto - inss - ir) };
}

/**
 * CLT: tudo que a pessoa recebe em 1 ano, já líquido.
 * c = { salario, beneficiosMensais, plrAnual, dependentes }
 */
export function clt({ salario, beneficiosMensais = 0, plrAnual = 0, dependentes = 0 }) {
  const mes = liquidoMes(salario, dependentes);
  const ferias = liquidoMes(salario * (4 / 3), dependentes); // mês de férias com 1/3
  const decimo = liquidoMes(salario, dependentes); // aproximação: 13º tributado como um salário
  const fgts = r2(salario * P.fgts * (12 + 1 + 1 / 3));
  // PLR tem tabela própria e isenção alta; aqui tratada como líquida informada pelo usuário
  const anual = {
    salarios: r2(mes.liquido * 11 + ferias.liquido),
    decimo: decimo.liquido,
    fgts,
    beneficios: r2(beneficiosMensais * 12),
    plr: r2(plrAnual),
  };
  const impostos = {
    inss: r2(mes.inss * 11 + ferias.inss + decimo.inss),
    ir: r2(mes.ir * 11 + ferias.ir + decimo.ir),
  };
  const total = r2(Object.values(anual).reduce((a, b) => a + b, 0));
  return { mes, ferias, decimo, anual, impostos, total, brutoAnual: r2(salario * (13 + 1 / 3)) };
}

export function simples(rbt12, tabela) {
  const f = tabela.find(([lim]) => rbt12 <= lim) || tabela[tabela.length - 1];
  const efetiva = rbt12 > 0 ? Math.max(0, (rbt12 * f[1] - f[2]) / rbt12) : tabela[0][1];
  return { nominal: f[1], efetiva };
}

/**
 * PJ no Simples Nacional, faturamento mensal F constante.
 * estrategia: 'III' (pró-labore de 28% para cair no Anexo III pelo Fator R) ou 'V' (pró-labore mínimo, Anexo V)
 * p = { custosMensais, mesesFaturados, dependentes }
 */
export function pj(F, estrategia, { custosMensais = 0, mesesFaturados = 12, dependentes = 0 } = {}) {
  const anualFat = F * mesesFaturados;
  const rbt12 = anualFat;
  const tabela = estrategia === 'III' ? P.anexoIII : P.anexoV;
  const { efetiva } = simples(rbt12, tabela);
  const das = r2(anualFat * efetiva);
  // pró-labore pago nos meses com faturamento
  const proLabore = estrategia === 'III'
    ? Math.max(P.salarioMinimo, Math.ceil(F * P.fatorR * 100) / 100)
    : P.salarioMinimo;
  const inssPL = inssProLabore(proLabore);
  const irPL = irrf(proLabore, inssPL, dependentes);
  const custos = r2(custosMensais * 12);
  const lucroAnual = r2(anualFat - das - proLabore * mesesFaturados - custos);
  // dividendos distribuídos mensalmente nos meses faturados
  const divMes = lucroAnual / mesesFaturados;
  const irDiv = divMes > P.dividendos.limiteMensal ? r2(divMes * P.dividendos.aliquota * mesesFaturados) : 0;
  const liquidoProLabore = r2((proLabore - inssPL - irPL) * mesesFaturados);
  const liquidoDividendos = r2(lucroAnual - irDiv);
  const total = r2(liquidoProLabore + liquidoDividendos);
  return {
    estrategia, faturamentoMensal: r2(F), faturamentoAnual: r2(anualFat), aliquotaEfetiva: efetiva,
    das, proLabore: r2(proLabore), inssPL: r2(inssPL * mesesFaturados), irPL: r2(irPL * mesesFaturados),
    custos, lucroAnual, irDiv, total,
    impostosTotais: r2(das + inssPL * mesesFaturados + irPL * mesesFaturados + irDiv),
  };
}

/** Faturamento mensal que entrega o mesmo líquido anual do CLT (busca binária) */
export function equivalente(alvoAnual, estrategia, opts) {
  let lo = 0, hi = 400000;
  if (pj(hi, estrategia, opts).total < alvoAnual) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pj(mid, estrategia, opts).total >= alvoAnual) hi = mid; else lo = mid;
  }
  const res = pj(Math.ceil(hi), estrategia, opts);
  return res.faturamentoAnual > 4800000 ? null : res;
}

export function calcular(input) {
  const c = clt(input);
  const opts = { custosMensais: input.custosMensais, mesesFaturados: input.mesesFaturados, dependentes: input.dependentes };
  const alvo = c.total * (1 + (input.margem || 0));
  const III = equivalente(alvo, 'III', opts);
  const V = equivalente(alvo, 'V', opts);
  const melhor = [III, V].filter(Boolean).sort((a, b) => a.faturamentoMensal - b.faturamentoMensal)[0] || null;
  return { clt: c, alvo: r2(alvo), III, V, melhor };
}
