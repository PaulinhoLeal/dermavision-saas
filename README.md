# DermaVision

MVP web navegável do projeto Dermatologia Assistida Brasil, baseado no documento de visão e nos casos de uso fornecidos.

## Executar

Requer Node.js 20 ou superior. Não há dependências externas.

Entre na pasta dermavision-saas com o PowerShell e execute: node serve.mjs

Abra http://127.0.0.1:4173. O formulário já vem preenchido com credenciais demonstrativas; qualquer endereço de e-mail e senha não vazios abrem a sessão local. A autenticação é apenas cenográfica e não protege dados.

## Fluxos incluídos

- Painel da clínica com agenda do dia, pacientes recentes, atividades e atalhos.
- Cadastro, busca, edição, desativação e reativação de pacientes.
- Prontuário demonstrativo com histórico, consultas, lesões, tratamentos e exames.
- Agendamento com validação de sobreposição de horários, registro de atendimento e cancelamento preservando o histórico.
- Mapa corporal frontal e posterior, cadastro de lesões, marcadores de acompanhamento, medidas cronológicas, arquivamento e restauração.
- Upload local de imagens JPG, PNG e WebP até 15 MB por arquivo, galeria e comparação antes/depois. Os arquivos ficam no IndexedDB do navegador.
- Sugestões assistivas simuladas com aceite ou rejeição profissional e trilha local de auditoria. Não há análise real de imagens.
- Exportação de listas e relatórios CSV. A opção de PDF abre a janela de impressão para salvar como PDF.
- Preferências da unidade e consulta de eventos de auditoria.

## Limites deste MVP

Esta pasta entrega uma demonstração funcional de interface e fluxos, não um serviço SaaS de produção. Os registros ficam no localStorage e as imagens no IndexedDB do navegador atual. Não existe API, banco central, sincronização, controle real de acesso, recuperação de senha, armazenamento em nuvem, backup ou isolamento entre clínicas. A tela de login é apenas uma entrada de demonstração.

Todos os registros fornecidos são fictícios. Não informe dados reais de pacientes nem use este MVP em atendimento. A IA não está conectada e suas porcentagens são valores ilustrativos para apresentar o fluxo de validação; o sistema não faz diagnóstico ou recomendação clínica.

O documento de visão aponta Angular, .NET/C#, PostgreSQL, autenticação JWT/RBAC, armazenamento de objetos e infraestrutura em nuvem como tecnologias previstas. O ambiente usado para esta entrega não possui SDK .NET. O passo de produção deve substituir o armazenamento local e a entrada demonstrativa por uma API autenticada, banco de dados, armazenamento seguro de imagens, autorização por clínica, auditoria persistente, backups, observabilidade e revisão de privacidade e segurança antes de qualquer dado real.

## Reiniciar os dados

Na aplicação, abra Configurações → Preferências → Restaurar dados fictícios. A ação repõe os registros iniciais e remove as imagens salvas nesta origem pelo navegador.
## Testes

Execute `npm test` para rodar a suíte de integração do servidor. A cobertura manual da interface e os limites estão documentados em [TESTING.md](TESTING.md).
