
import { Member } from "../types";

// Nota para o Desenvolvedor:
// Para usar um banco de dados real (ex: Supabase), você instalaria '@supabase/supabase-js'
// e substituiria a lógica interna destas funções pelas chamadas da biblioteca.

const STORAGE_KEY = 'carnival_members_db_v3';

/**
 * Simula uma chamada de banco de dados com atraso de rede
 */
const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 600));

export const databaseService = {
  /**
   * Busca todos os membros do banco de dados
   */
  async getMembers(): Promise<Member[]> {
    await simulateNetworkDelay();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Adiciona um novo membro ao banco de dados
   */
  async addMember(member: Member): Promise<void> {
    //await simulateNetworkDelay();
    await supabase.from('membros').insert(member);
    const members = await this.getMembers();
    const updatedMembers = [member, ...members];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMembers));
    
    // Se fosse Supabase seria:
    // await supabase.from('membros').insert(member);
  },

  /**
   * Remove um membro do banco de dados
   */
  async deleteMember(id: string): Promise<void> {
    //await simulateNetworkDelay();
    await supabase.from('membros').delete().eq('id', id);
    const members = await this.getMembers();
    const updatedMembers = members.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMembers));
    
    // Se fosse Supabase seria:
    // await supabase.from('membros').delete().eq('id', id);
  }
};
