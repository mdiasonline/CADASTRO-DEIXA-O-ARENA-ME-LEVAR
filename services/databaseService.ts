
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member } from "../types";

// Instância singleton para o cliente do Supabase
let supabaseInstance: SupabaseClient | null = null;

/**
 * Tenta obter uma variável de ambiente de forma segura no navegador/Vite
 */
const getEnvVar = (key: string): string => {
  try {
    // 1. Tenta via import.meta.env (Padrão do Vite)
    // @ts-ignore
    const viteVar = import.meta.env?.[`VITE_${key}`] || import.meta.env?.[key];
    if (viteVar) return viteVar;

    // 2. Tenta via process.env (Padrão Node/Vercel clássico)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key] || process.env[`VITE_${key}`] || "";
    }
  } catch (e) {
    console.warn(`Erro ao tentar acessar variável ${key}:`, e);
  }
  return "";
};

/**
 * Inicializa o cliente apenas quando necessário.
 */
const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = getEnvVar('SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("⚠️ ERRO DE CONFIGURAÇÃO:");
    console.error("As variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não foram encontradas.");
    console.info("Dica: No Vercel, use os nomes VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (err) {
    console.error("❌ Falha crítica ao inicializar cliente Supabase:", err);
    return null;
  }
};

export const databaseService = {
  /**
   * Busca todos os membros do banco de dados real
   */
  async getMembers(): Promise<Member[]> {
    const client = getSupabase();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('membros')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error("Erro Supabase (Select):", error.message);
        return [];
      }

      return (data as Member[]) || [];
    } catch (err) {
      console.error("Erro de conexão ao buscar membros:", err);
      return [];
    }
  },

  /**
   * Adiciona um novo membro ao banco de dados real
   */
  async addMember(member: Member): Promise<void> {
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado.");

    const { error } = await client
      .from('membros')
      .insert([member]);

    if (error) {
      console.error("Erro Supabase (Insert):", error.message);
      throw error;
    }
  },

  /**
   * Remove um membro do banco de dados real
   */
  async deleteMember(id: string): Promise<void> {
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado.");

    const { error } = await client
      .from('membros')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro Supabase (Delete):", error.message);
      throw error;
    }
  }
};
