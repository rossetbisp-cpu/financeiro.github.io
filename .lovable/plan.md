
## Escopo

Adicionar 5 áreas ao app já existente (login + dashboard de despesas) e dar um acabamento premium com a marca **Rosset Têxtil**.

### 1. Identidade visual premium (Rosset)
- Logo Rosset (`rosset.png`) carregado como asset Lovable, usado no header e na tela de login.
- Refino do tema **Navy Trust**: tipografia display + body distinta, sombras suaves, glassmorphism em cards, divisores finos, microanimações em hover/transições de página (Framer Motion).
- Shell de app com sidebar fixa (Dashboard · Lançar Despesa · Fornecedores · Instruções · Sair) + topo com breadcrumb e logo.

### 2. Dashboard — seções por pacote + gráficos filtráveis
- Nova seção **"Gastos por Pacote"**: grid de cards (um por pacote) com total, % do total, mini sparkline mensal e drill-down de subpacotes.
- Novo gráfico interativo **"Evolução mensal"**:
  - Toggle de **tipo de dado**: `Pacote` ou `Fornecedor`.
  - Multi-select de opções **populado dinamicamente** com o tipo selecionado (só pacotes ou só fornecedores existentes).
  - BarChart/LineChart empilhado por mês com séries selecionadas; eixo Y em R$, tooltip BRL.
- Mantém filtros atuais (mês, busca) acima.

### 3. Página "Lançar Despesa" (`/lancar`)
Formulário guiado em etapas (Card único com seções):
- **Dados gerais**: carimbo data/hora (auto), data recebimento, data emissão, data vencimento, valor total, fornecedor (autocomplete da tabela fornecedores), tipos de documento enviado (multi: Nota, Boleto, Kit), upload de anexos (storage bucket privado).
- **Rateio**: 
  - Modo **Interno** → seleção das marcas participantes (VALISERE, ÁGUA DOCE, CIA.MARÍTIMA, TRIUMPH, BODY FOR SURE) + valor por marca (com presets rápidos derivados da planilha: combos "Valisere+Água Doce", "SP (Valisere+BFS+Cia)", "RJ (Triumph)", "Designer Vinícius = Valisere+BFS+Cia", "Neomode = Cia+Valisere+BFS", etc.).
  - Modo **Externo** → valor final já vem por marca, sem prorrateio.
  - Validação: soma das marcas = valor total (toast com diff).
  - Botão "Aplicar share do mês" usando uma tabela `brand_shares` (mês × marca × share) — opcional, só aparece quando marcas escolhidas têm share cadastrado.
- Ao salvar: gera **N linhas em `expenses`** (uma por marca rateada), preservando `valor`, `fornecedor`, `descricao`, `pacote`, `subpacote`, `c_custo` derivado da marca.

### 4. Página "Fornecedores" (`/fornecedores`)
- Nova tabela `suppliers` (nome, cnpj opcional, contato, marcas atendidas, pacote padrão, dias de prazo, observações, domínio para logo Clearbit).
- CRUD completo: lista pesquisável + sheet lateral de criar/editar.
- Logo automática via `PartnerLogo` (Clearbit + fallback).
- Coluna "Total gasto" calculada cruzando com `expenses`.

### 5. Página "Instruções" (`/instrucoes`)
- Reproduz o infográfico Rossetinho em 10 passos como timeline vertical responsiva, com ícones lucide e cards numerados (1. Emissão e envio → 10. Processo encerrado).
- Banner com e-mail oficial `cobranca.digital@rosset.com.br` e CTA "Lançar despesa".

### 6. Backend (Lovable Cloud)
Migrações nesta ordem:
1. `suppliers` (com RLS authenticated CRUD, GRANTs).
2. `expense_attachments` (id, expense_id, path, mime, size) + bucket privado `expense-docs`.
3. `brand_shares` (month date, brand text, share numeric, unique(month,brand)) — seed opcional.
4. Coluna opcional `expenses.rateio_group_id uuid` para agrupar linhas de um mesmo lançamento.

Server functions novas (`createServerFn` + `requireSupabaseAuth`):
- `listSuppliers`, `upsertSupplier`, `deleteSupplier`.
- `createExpenseEntry({ header, splits, attachments })` que insere todas as linhas atomicamente.

### 7. Navegação & rotas
- Move dashboard para shell autenticado com sidebar.
- Novas rotas: `/_authenticated/lancar`, `/_authenticated/fornecedores`, `/_authenticated/instrucoes`. Cada uma com `head()` próprio.

## Fora de escopo (confirme se quer incluir)
- Aprovações multi-nível (gerente → diretoria) com workflow.
- Importação automática do .xlsb / sincronização com Sheets.
- Cálculo automático de share a partir de Receita Líquida (hoje proposto como tabela manual `brand_shares`).

## Pergunta única antes de implementar
**Confirma essas três premissas?** (1) cada lançamento com rateio vira N linhas em `expenses` (uma por marca); (2) upload de anexos em bucket privado do Cloud (visível só para autenticados); (3) `brand_shares` começa vazio — você popula depois, sem importar a planilha agora. Se sim, sigo direto na implementação.
