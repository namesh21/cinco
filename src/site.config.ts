// Configurações centrais do site. Edite aqui.
export const SITE = {
  name: 'Cinco Invest',
  brand: 'Cinco Invest ⤴',
  tagline: 'O Guia do Novo Investidor',
  description:
    'Aprenda a base das finanças pessoais e saiba investir o seu próprio dinheiro: renda fixa, renda variável, impostos, indicadores e empresas da Bolsa. Conteúdo 100% gratuito.',
  url: 'https://cincoinvest.com.br',
  locale: 'pt-BR',
  ogLocale: 'pt_BR',
  defaultImage: '/og-default.png',
  logo: '/logo.png',
  // Autor padrão (usado em posts sem autor conhecido e no schema). Troque por uma pessoa real para reforçar E-E-A-T.
  defaultAuthor: { slug: 'redacao', name: 'Redação Cinco Invest', url: '/sobre/' },
  // Perfis oficiais (sameAs no schema Organization)
  sameAs: [] as string[],
  // Tags com menos posts que isso ficam com noindex,follow e fora do sitemap (evita páginas finas)
  tagIndexMinPosts: 2,
  postsPerPage: 12,
  // Medição / monetização — deixe vazio para desativar
  ga4Id: '', // ex.: 'G-XXXXXXX'
  adsenseClient: '', // ex.: 'ca-pub-0000000000000000'
  // Navegação principal (slugs de categoria)
  nav: ['cinco-maneiras', 'dicas', 'renda-fixa', 'renda-variavel', 'empresas', 'impostos', 'indicadores', 'news', 'quem-e'],
  disclaimer:
    'Conteúdo educativo. As informações deste site não constituem recomendação de investimento. Avalie seu perfil e, se necessário, consulte um profissional certificado antes de investir.',
};

export type SiteConfig = typeof SITE;
