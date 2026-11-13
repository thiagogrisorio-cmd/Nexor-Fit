# Nexor-Fit — distribuição, catálogo e abdômen

Revisão de 13/11/2026. Implementação em prévia local; não publicada no GitHub Pages nem no Firebase de produção.

## O que mudou

- Catálogo passou de 61 para 90 exercícios, preservando os IDs anteriores. Inclui 15 opções de core/abdômen no total, com alternativas de flexão do tronco, controle da pelve, anti-rotação, estabilidade lateral e anti-extensão. Não tratamos “superior/inferior” como músculos abdominais independentes nem prometemos perda localizada de gordura.
- Novos equipamentos: máquina abdominal, extensora, abdutora/adutora, elevação pélvica, panturrilha sentada e elevação lateral. Guias originais descrevem execução, acessórios, ajustes e cuidados, com esquemas SVG locais. São esquemas, não fotos de modelos específicos.
- A substituição de core preserva também a função: uma flexão abdominal não é apresentada como equivalente a um exercício anti-rotação.
- “Corpo todo na semana” distribui os grupos entre sessões. “Full body” combina inferiores, empurrar e puxar em cada sessão de academia. Braços e ombros recebem trabalho indireto nos compostos; não significa isolar todos os músculos a cada dia.
- Para cinco ou seis dias em divisão por membros, pergunta-se quantos dias de inferiores: um, dois ou três. Um dia é completo; dois separam quadríceps de posteriores/glúteos; três acrescentam unilateral e estabilidade. As sessões se distribuem entre as de superiores.
- Gênero opcional: Masculino, Feminino ou Prefiro não informar. A ordem solicitada pelo proprietário é inferiores primeiro para Feminino e superiores primeiro nas outras opções. É uma preferência do produto, não uma conclusão de que o gênero determine necessidades ou capacidade. Não muda a cobertura muscular. Full body independe dessa ordem.
- O gerador favorece exercícios menos utilizados na mesma semana, preservando dificuldade, equipamentos e tempo. Quando só existe uma alternativa adequada, permite repetição e explica isso. Aumentar nomes artificialmente ou trocar por variações difíceis não melhora a prescrição.
- Em full body com quatro a seis sessões, distribui-se o trabalho em duas séries por exercício. Não se prescreve esforço máximo diário. A ficha explica a necessidade de recuperação. Se 20 minutos não comportarem inferiores/empurrar/puxar com o descanso escolhido, pede-se mais tempo, sem chamar uma sessão incompleta de full body.
- A geração e a confirmação continuam levando ao topo. Fichas e sessões anteriores não são reescritas automaticamente: a pessoa revisa e confirma a nova ficha.

## Exemplo: cinco dias, dois inferiores

Feminino: inferiores/quadríceps; peito/ombros/tríceps; costas/bíceps; inferiores/posteriores e glúteos; superiores complementares. Outras opções começam com superiores, intercalando inferiores. O calendário é ilustrativo, não uma avaliação de recuperação individual.

O volume direto de abdômen alterna, quando há tempo, máquina/flexão, Pallof, estabilidade lateral, anti-extensão e controle da pelve. Exercícios estáticos contados em segundos ainda não foram adicionados: não seriam corretamente representados pelo contrato atual de repetições. As opções de prancha adicionadas são dinâmicas, com repetições por lado.

## Base consultada e limites de interpretação

1. [ACSM — diretrizes de treino resistido de 2026](https://acsm.org/resistance-training-guidelines-update-2026/): orientam consistência, individualização e trabalho dos grandes grupos, normalmente em pelo menos duas exposições semanais. O app mostra séries planejadas, e uma escolha de apenas um dia de inferiores pode ficar abaixo dessa frequência. A seleção do usuário não é ocultada nem descrita como ótima para todos.
2. [Ramos-Campo e colaboradores — revisão sistemática split versus full body, 2024](https://pubmed.ncbi.nlm.nih.gov/38595233/): ambas são estratégias válidas; a divisão, isoladamente, não demonstra superioridade quando o volume é equivalente. Não usamos esse estudo para declarar uma sequência A–E universalmente melhor. O registro bibliográfico/resultado de busca foi consultado; não se afirma leitura integral de um livro ou de todos os estudos incluídos.
3. [NASM — biblioteca de exercícios](https://www.nasm.org/workout-exercise-guidance) e [ACE — biblioteca](https://www.acefitness.org/resources/everyone/exercise-library/): referências de movimentos e equipamentos. Os textos no aplicativo foram redigidos para o catálogo, não copiados dessas bibliotecas. O catálogo é curado e limitado; não abrange todos os exercícios existentes.
4. [Life Fitness — instruções oficiais de aparelhos](https://kb.cybexintl.com/Product_Info/Life_Fitness_Circuit_Series_Machine_Use_Instructions.pdf): referência para abdominal na máquina, extensora e flexora. A regulagem concreta depende do modelo. Não copiamos cargas nem atribuímos benefícios clínicos ao aplicativo.

A separação de inferiores e a alternância funcional de core são decisões de programação do produto, informadas pelas referências; não foram testadas como um protocolo clínico próprio. Em casa sem acessórios não existe remada/puxada equivalente no catálogo: essa limitação é explicitada, inclusive em full body. Fichas curtas podem não comportar isoladores de todos os grupos; o app informa o limite de tempo e mostra o que foi efetivamente incluído.

## Validação e segurança

- 327 testes unitários passaram, incluindo cinco novos cenários de distribuição, catálogo, limites, gênero e ambientes. As matrizes anteriores de perfil e equipamentos continuam passando.
- Oito cenários de regras passaram no emulador isolado, incluindo ficha de seis dias com perfil completo, sessão com novos IDs, privacidade entre usuários e negação de campos inválidos.
- A validação das regras foi otimizada para caber no limite de avaliação, mantendo limites de tamanho, tipos, catálogo conhecido, propriedade e revisão. A lista canônica de 23 equipamentos tem um caminho de igualdade; listas alternativas continuam limitadas e sem duplicatas.
- A prévia foi conferida no navegador: pergunta condicional, ordem Feminino/inferiores, salvamento, retorno ao topo, início de sessão e guia da máquina abdominal.
- As regras continuam sendo um protótipo. Auditoria: 4/5. O proprietário pode contornar a recomendação biomecânica pelo acesso direto à própria API; não foi identificado acesso a dados de outra conta. Publicação ampla ainda exige revisão das regras e do catálogo por profissionais responsáveis.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only access, bounded schemas, immutable session prescriptions and revision checks. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
