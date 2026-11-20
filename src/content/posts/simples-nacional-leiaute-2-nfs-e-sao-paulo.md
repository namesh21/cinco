---
title: "Simples Nacional e leiaute 2 da NFS-e em São Paulo: o que significa o aviso de 01/11/2026"
description: "Entenda a mensagem “Emissões de Simples Nacional com fato gerador a partir de 01/11/2026 deverão utilizar o leiaute 2” no sistema da Prefeitura de São Paulo."
pubDate: "2026-11-20T16:45:00Z"
category: "impostos"
categories: ["impostos"]
tags: ["nfs-e", "simples-nacional", "reforma-tributaria", "nota-fiscal-paulistana"]
author: "redacao"
---
Quem emite nota fiscal de serviço em São Paulo pode ter esbarrado, em novembro de 2026, numa mensagem curta e confusa do sistema da Prefeitura:

> **“Emissões de Simples Nacional com fato gerador a partir de 01/11/2026 deverão utilizar o leiaute 2.”**

Ela aparece quando uma nota de uma empresa do Simples Nacional é enviada ao sistema municipal (a Nota Fiscal Paulistana, pela tela on-line ou pelo webservice) no formato antigo, o **leiaute 1**, para um serviço prestado de 1º de novembro de 2026 em diante. Neste artigo explicamos o que é cada leiaute, por que a regra mudou nessa data e, principalmente, o que fazer, porque para a maioria das empresas do Simples a solução **não é só trocar o leiaute**.

## Resumo rápido

- **Leiaute 1** é o modelo antigo da NFS-e paulistana, só com ISS.
- **Leiaute 2** é o modelo novo, criado para a Reforma Tributária, com campos de ISS, IBS e CBS.
- Desde **1º/11/2026**, microempresas (ME) e empresas de pequeno porte (EPP) do Simples Nacional são obrigadas a emitir a NFS-e pelo **Emissor Nacional**, e não mais pelo sistema da Prefeitura.
- O sistema paulistano segue aberto para **consultas e notas de serviços prestados até 31/10/2026**.
- Se o seu sistema recebeu essa mensagem para um serviço de novembro, o mais provável é que ele ainda esteja apontando para a Prefeitura quando deveria emitir no Emissor Nacional.

## O que são o leiaute 1 e o leiaute 2

“Leiaute” é o formato do arquivo (XML) que o sistema da empresa envia à Prefeitura para gerar a nota. São Paulo manteve seu emissor próprio durante a transição da Reforma Tributária e passou a aceitar dois modelos:

- **Leiaute 1:** o formato que já existia, usado para apurar apenas o ISS.
- **Leiaute 2:** o formato novo, para apuração conjunta de ISS, IBS e CBS. Ficou disponível a partir de 1º de janeiro de 2026, nas emissões on-line e por webservice.

Para as empresas fora do Simples (Lucro Presumido e Lucro Real), o leiaute 2 passou a ser obrigatório em agosto de 2026. Já os optantes do Simples continuavam no leiaute 1, porque o destaque de IBS e CBS ainda não era exigido deles.

A Instrução Normativa SF/SUREM nº 13/2026, publicada no Diário Oficial da Cidade em 5 de novembro de 2026, formalizou o leiaute 2 na norma municipal que trata dos leiautes da NFS-e (IN SF/SUREM nº 8/2018). Entre as regras de preenchimento, o “Valor Total da Nota” deve incluir todos os valores recebidos pelo serviço, inclusive reembolsos de despesas repassadas a terceiros, que são deduzidos da base por meio de documentos referenciados.

## Por que a data de 1º de novembro de 2026

A data vem da **Resolução CGSN nº 191, de 4 de agosto de 2026**. Ela tornou obrigatória a NFS-e de padrão nacional para ME e EPP do Simples a partir de 1º de novembro de 2026 (antes, a previsão era 1º de setembro). A emissão passa a ser feita pelo **Emissor Nacional da NFS-e**, na versão web ou por integração via API.

A Prefeitura de São Paulo incorporou a regra à sua legislação com a mesma IN 13/2026. Os pontos principais:

- O Emissor Nacional é obrigatório para ME e EPP do Simples, inclusive quando a opção pelo regime ainda está pendente de análise ou em discussão administrativa.
- Também entram na regra as sociedades uniprofissionais optantes do Simples, os profissionais liberais e autônomos isentos (estes desde 1º/08/2026) e o MEI que presta serviço a empresas (tomador com CNPJ).
- Quem está obrigado ao Emissor Nacional **não pode mais emitir pelo sistema próprio do Município**. A proibição continua valendo mesmo que a empresa seja depois desenquadrada do Simples.
- O sistema municipal segue disponível para **consulta e emissão de notas de fatos geradores ocorridos até 31/10/2026**.

## Então por que a mensagem fala em leiaute 2?

É uma regra de validação do sistema paulistano. A partir de 1º/11/2026, qualquer nota de prestador do Simples que ainda chegue ao sistema municipal com fato gerador nessa data ou depois precisa vir no leiaute 2. Se vier no leiaute 1, é recusada com esse aviso.

Na prática, poucas empresas do Simples ainda podem emitir no sistema municipal depois dessa data: as exceções são situações específicas previstas na própria norma. **Para a ME ou EPP comum do Simples, a mensagem é um sinal de que a nota está indo para o lugar errado.** Mudar o arquivo para o leiaute 2 não resolve, porque a emissão para essa competência deve acontecer no Emissor Nacional.

> **Atenção:** essa é a leitura que fazemos das normas e comunicados publicados até 20/11/2026. Se a sua empresa tem alguma particularidade (sociedade uniprofissional, opção pendente, desenquadramento recente), confirme com o seu contador antes de emitir.

## “Fato gerador” não é a data de emissão

O ponto que mais gera confusão é a data que vale. A regra olha para o **fato gerador**, que é quando o serviço foi prestado (a competência), e não para o dia em que a nota é emitida.

| Situação | Onde emitir |
|---|---|
| Serviço prestado em outubro, nota emitida em 5 de novembro | Sistema da Prefeitura (emissão retroativa, fato gerador até 31/10/2026) |
| Serviço prestado em 3 de novembro | Emissor Nacional da NFS-e |
| Serviço prestado em outubro, nota que precisa ser corrigida em dezembro | Sistema da Prefeitura, pelas regras de competências anteriores à migração |

Se o seu sistema de gestão preenche a data de competência automaticamente com a data de emissão, vale revisar essa configuração: é uma causa comum de rejeição nos dois sentidos.

## E o IBS e a CBS para quem é do Simples?

Usar o Emissor Nacional desde 1º de novembro **não obriga** a preencher os campos de IBS e CBS ainda. Para o Simples, são dois cronogramas diferentes: o preenchimento desses grupos é facultativo até 31/12/2026 e passa a ser exigido a partir de 2027. A Prefeitura também informou que alguns prazos de destaque de IBS e CBS previstos para 1º de dezembro de 2026 foram adiados para 1º de janeiro ou 1º de março de 2027, conforme o tipo de operação. A data de migração do Simples para o Emissor Nacional, porém, continuou sendo 1º de novembro.

Outro prazo que já passou: quem quisesse optar pelo regime regular de IBS/CBS dentro do Simples tinha até 30/10/2026. O cancelamento dessa opção, ou da própria opção pelo Simples, pode ser feito de 3/11 a 20/12/2026.

## Checklist para a empresa do Simples em São Paulo

1. **Confirme o regime e o enquadramento** no cadastro da Prefeitura (CCM) e no Portal do Simples Nacional.
2. **Garanta o acesso ao Emissor Nacional.** ME e EPP entram com certificado digital; o login pelo gov.br vale apenas para o MEI.
3. **Monte uma tabela de correspondência de códigos.** O código de serviço municipal de cinco dígitos dá lugar ao código de tributação nacional, baseado na lista da LC 116/2003.
4. **Peça ao fornecedor do seu ERP ou emissor** a troca da integração do webservice da Prefeitura pela API do Emissor Nacional, para competências a partir de novembro.
5. **Separe as notas pela data do serviço:** até 31/10 no sistema municipal, de 1º/11 em diante no Emissor Nacional.
6. **Revise a data de competência** que o sistema preenche automaticamente.
7. **Programe-se para 2027**, quando os campos de IBS e CBS deixam de ser opcionais para o Simples.

## Conclusão

A frase do sistema parece só uma troca técnica de formato, mas reflete uma mudança maior: em São Paulo, a nota de serviço do Simples Nacional mudou de endereço. Para serviços prestados a partir de 1º de novembro de 2026, o caminho padrão da ME e da EPP é o Emissor Nacional, e o sistema da Prefeitura fica para consultas e para o que aconteceu até outubro. Se a mensagem apareceu para você, verifique primeiro **onde** a nota está sendo emitida, e só depois **em qual formato**.

**Fontes oficiais para acompanhar:** Secretaria Municipal da Fazenda de São Paulo (prefeitura.sp.gov.br/fazenda), portal da Nota Fiscal Paulistana / Nota do Milhão e Portal Nacional da NFS-e (gov.br/nfse).

*Conteúdo educativo, com base nas normas e comunicados disponíveis em 20 de novembro de 2026. Não substitui a orientação do seu contador.*
