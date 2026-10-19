# Validação do DermaVision

## Suíte automatizada

Execute `npm test` com Node.js 20 ou superior. Os testes iniciam um servidor isolado em uma porta temporária e cobrem:

- entrega do HTML e cabeçalhos de segurança;
- tipo MIME de arquivos estáticos;
- resposta HEAD sem corpo;
- rejeição de métodos HTTP não permitidos;
- bloqueio de traversal e de separadores inválidos;
- resposta 404 para recursos ausentes.

O servidor principal não é iniciado nem alterado pela suíte.

## Verificações manuais de interface

A validação de navegador cobriu os fluxos demonstrativos de cadastro, edição, busca, prontuário, agendamento, atendimento, cancelamento, lesões, evolução, arquivamento, imagens, sugestões, exportações, relatórios, preferências e auditoria. Foram exercitados também entradas inválidas, conflitos de horário, filtros, estados ativos/inativos e largura móvel.

Defeitos corrigidos durante a validação:

- medições registradas no mesmo dia agora mantêm a mais recente no topo e no cartão de evolução;
- arquivos com extensão/MIME de imagem, mas conteúdo ilegível, são rejeitados;
- a tabela mantém sua rolagem dentro do painel em telas estreitas, sem alargar a página.

A ação de PDF abre o diálogo de impressão do navegador; a confirmação de impressão ou gravação do arquivo depende do usuário e não foi automatizada.

## Limites da cobertura

A suíte automatizada exercita o servidor HTTP. Os fluxos de interface foram verificados manualmente no navegador. Login real, armazenamento central, isolamento por clínica, pagamentos e inferência de IA não existem neste MVP local e, portanto, não podem ser aprovados por estes testes.
