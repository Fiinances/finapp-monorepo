-- ============================================================
-- V2 — Seeding de Categorias Padrão
-- Gerado em: 2026-05-03
-- Gerenciado por: Flyway (quarkus-flyway)
--
-- Cria:
--   1. Função seed_default_categories_for_user(uuid)
--   2. Função handle_new_user_categories() — trigger handler
--   3. Trigger on_auth_user_created_seed_categories
--      → chamado automaticamente ao criar novo usuário no Supabase Auth
--
-- Fix G-03: seeding automático garante que categorias estejam
-- disponíveis globalmente para qualquer usuário, sem depender
-- de uma rota específica do app.
-- ============================================================

-- ============================================================
-- FUNÇÃO: seed completo de categorias para um usuário
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_categories_for_user(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  id_alimentacao    BIGINT;
  id_transporte     BIGINT;
  id_moradia        BIGINT;
  id_saude          BIGINT;
  id_educacao       BIGINT;
  id_lazer          BIGINT;
  id_roupas         BIGINT;
  id_financeiro     BIGINT;
  id_outros         BIGINT;
  id_trabalho       BIGINT;
  id_investimentos  BIGINT;
  id_receitas       BIGINT;
BEGIN
  -- Categorias pai (despesa)
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Alimentação',    '#f97316', '🍽️',  'expense') RETURNING id INTO id_alimentacao;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Transporte',     '#3b82f6', '🚗',  'expense') RETURNING id INTO id_transporte;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Moradia',        '#8b5cf6', '🏠',  'expense') RETURNING id INTO id_moradia;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Saúde',          '#ef4444', '❤️‍🩹', 'expense') RETURNING id INTO id_saude;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Educação',       '#06b6d4', '📚',  'expense') RETURNING id INTO id_educacao;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Lazer',          '#ec4899', '🎮',  'expense') RETURNING id INTO id_lazer;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Roupas',         '#f59e0b', '👕',  'expense') RETURNING id INTO id_roupas;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Financeiro',     '#6366f1', '💳',  'expense') RETURNING id INTO id_financeiro;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Outros',         '#6b7280', '📦',  'expense') RETURNING id INTO id_outros;

  -- Subcategorias (despesa)
  INSERT INTO transaction_categories (user_id, name, color, icon, type, parent_id) VALUES
    (p_user_id, 'Restaurante',    '#f97316', '🍴',  'expense', id_alimentacao),
    (p_user_id, 'Supermercado',   '#f97316', '🛒',  'expense', id_alimentacao),
    (p_user_id, 'Delivery',       '#f97316', '📦',  'expense', id_alimentacao),
    (p_user_id, 'Padaria',        '#f97316', '🥐',  'expense', id_alimentacao),
    (p_user_id, 'Lanchonete',     '#f97316', '🍔',  'expense', id_alimentacao),
    (p_user_id, 'Combustível',    '#3b82f6', '⛽',  'expense', id_transporte),
    (p_user_id, 'Uber / 99',      '#3b82f6', '🚕',  'expense', id_transporte),
    (p_user_id, 'Ônibus / Metrô', '#3b82f6', '🚌',  'expense', id_transporte),
    (p_user_id, 'Manutenção auto','#3b82f6', '🔧',  'expense', id_transporte),
    (p_user_id, 'Estacionamento', '#3b82f6', '🅿️',  'expense', id_transporte),
    (p_user_id, 'Aluguel',        '#8b5cf6', '🏘️', 'expense', id_moradia),
    (p_user_id, 'Condomínio',     '#8b5cf6', '🏢',  'expense', id_moradia),
    (p_user_id, 'Energia',        '#8b5cf6', '⚡',  'expense', id_moradia),
    (p_user_id, 'Água',           '#8b5cf6', '💧',  'expense', id_moradia),
    (p_user_id, 'Internet',       '#8b5cf6', '📶',  'expense', id_moradia),
    (p_user_id, 'Reforma',        '#8b5cf6', '🔨',  'expense', id_moradia),
    (p_user_id, 'Plano de Saúde', '#ef4444', '🏥',  'expense', id_saude),
    (p_user_id, 'Farmácia',       '#ef4444', '💊',  'expense', id_saude),
    (p_user_id, 'Consulta',       '#ef4444', '👨‍⚕️','expense', id_saude),
    (p_user_id, 'Academia',       '#ef4444', '🏋️', 'expense', id_saude),
    (p_user_id, 'Curso',          '#06b6d4', '🎓',  'expense', id_educacao),
    (p_user_id, 'Livros',         '#06b6d4', '📖',  'expense', id_educacao),
    (p_user_id, 'Escola',         '#06b6d4', '🏫',  'expense', id_educacao),
    (p_user_id, 'Streaming',      '#ec4899', '📺',  'expense', id_lazer),
    (p_user_id, 'Cinema',         '#ec4899', '🎬',  'expense', id_lazer),
    (p_user_id, 'Viagens',        '#ec4899', '✈️',  'expense', id_lazer),
    (p_user_id, 'Jogos',          '#ec4899', '🎮',  'expense', id_lazer),
    (p_user_id, 'Tarifa bancária','#6366f1', '🏦',  'expense', id_financeiro),
    (p_user_id, 'Juros',          '#6366f1', '📈',  'expense', id_financeiro),
    (p_user_id, 'Seguro',         '#6366f1', '🛡️', 'expense', id_financeiro);

  -- Categorias pai (receita)
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Salário',        '#22c55e', '💼',  'income') RETURNING id INTO id_trabalho;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Investimentos',  '#10b981', '📊',  'income') RETURNING id INTO id_investimentos;
  INSERT INTO transaction_categories (user_id, name, color, icon, type)
    VALUES (p_user_id, 'Outras Receitas','#84cc16', '💰',  'income') RETURNING id INTO id_receitas;

  -- Subcategorias (receita)
  INSERT INTO transaction_categories (user_id, name, color, icon, type, parent_id) VALUES
    (p_user_id, 'Salário mensal',  '#22c55e', '🗓️', 'income', id_trabalho),
    (p_user_id, 'Freelance',       '#22c55e', '💻',  'income', id_trabalho),
    (p_user_id, '13º salário',     '#22c55e', '🎁',  'income', id_trabalho),
    (p_user_id, 'Bônus',           '#22c55e', '⭐',  'income', id_trabalho),
    (p_user_id, 'Dividendos',      '#10b981', '💹',  'income', id_investimentos),
    (p_user_id, 'Rendimento',      '#10b981', '📈',  'income', id_investimentos),
    (p_user_id, 'Venda de ativo',  '#10b981', '🏷️', 'income', id_investimentos),
    (p_user_id, 'Aluguel recebido','#84cc16', '🏠',  'income', id_receitas),
    (p_user_id, 'Reembolso',       '#84cc16', '↩️',  'income', id_receitas);
END;
$$;

-- ============================================================
-- TRIGGER HANDLER: chamado pelo Supabase Auth ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_default_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed_categories ON auth.users;

CREATE TRIGGER on_auth_user_created_seed_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_categories();
