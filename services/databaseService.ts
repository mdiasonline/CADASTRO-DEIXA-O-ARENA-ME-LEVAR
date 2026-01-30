
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member } from "../types";

// Instância singleton para o cliente do Supabase
let supabaseInstance: SupabaseClient | null = null;

/**
 * Inicializa o cliente apenas quando necessário.
 * Isso evita o erro "supabaseUrl is required" se as variáveis
 * ainda não estiverem disponíveis no ambiente.
 */
const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  // Em ambientes de produção/Vercel, essas chaves vêm do process.env
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Supabase: Credenciais ausentes. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.");
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (err) {
    console.error("❌ Falha ao inicializar cliente Supabase:", err);
    return null;
  }
};

export const databaseService = {
  /**
   * Busca todos os membros do banco de dados real
   */
  async getMembers(): Promise<Member[]> {
    const client = getSupabase();
    if (!client) {
      throw new Error("Chaves do Supabase não configuradas no ambiente.");
    }

    const { data, error } = await client
      .from('membros')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error("Erro ao buscar foliões:", error.message);
      throw error;
    }

    return (data as Member[]) || [];
  },

  /**
   * Adiciona um novo membro ao banco de dados real
   */
  async addMember(member: Member): Promise<void> {
    const client = getSupabase();
    if (!client) {
      throw new Error("Chaves do Supabase não configuradas.");
    }

    const { error } = await client
      .from('membros')
      .insert([member]);

    if (error) {
      console.error("Erro ao inserir folião:", error.message);
      throw error;
    }
  },

  /**
   * Remove um membro do banco de dados real
   */
  async deleteMember(id: string): Promise<void> {
    const client = getSupabase();
    if (!client) {
      throw new Error("Chaves do Supabase não configuradas.");
    }

    const { error } = await client
      .from('membros')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao remover folião:", error.message);
      throw error;
    }
  }
};
