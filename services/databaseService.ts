
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member, EventPhoto } from "../types";

interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  getEventPhotos(): Promise<EventPhoto[]>;
  addEventPhoto(photo: EventPhoto): Promise<void>;
  deleteEventPhoto(id: string): Promise<void>;
  isLocal: boolean;
}

const localProvider: DBProvider = {
  isLocal: true,
  async getMembers(): Promise<Member[]> {
    const data = localStorage.getItem('carnaval_members');
    return data ? JSON.parse(data) : [];
  },
  async addMember(member: Member): Promise<void> {
    const members = await this.getMembers();
    localStorage.setItem('carnaval_members', JSON.stringify([member, ...members]));
  },
  async deleteMember(id: string): Promise<void> {
    const members = await this.getMembers();
    const filtered = members.filter(m => m.id !== id);
    localStorage.setItem('carnaval_members', JSON.stringify(filtered));
  },
  async getEventPhotos(): Promise<EventPhoto[]> {
    const data = localStorage.getItem('carnaval_event_photos');
    return data ? JSON.parse(data) : [];
  },
  async addEventPhoto(photo: EventPhoto): Promise<void> {
    const photos = await this.getEventPhotos();
    localStorage.setItem('carnaval_event_photos', JSON.stringify([photo, ...photos]));
  },
  async deleteEventPhoto(id: string): Promise<void> {
    const photos = await this.getEventPhotos();
    const filtered = photos.filter(p => p.id !== id);
    localStorage.setItem('carnaval_event_photos', JSON.stringify(filtered));
  }
};

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    if (env) {
      const val = env[`VITE_${key}`] || env[key];
      if (val) return val;
    }
  } catch (e) {}
  return "";
};

let supabaseInstance: SupabaseClient | null = null;

const getProvider = (): DBProvider => {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');

  if (!url || !key) return localProvider;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }

  return {
    isLocal: false,
    async getMembers(): Promise<Member[]> {
      const { data, error } = await supabaseInstance!
        .from('membros')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return (data as Member[]) || [];
    },
    async addMember(member: Member): Promise<void> {
      const { error } = await supabaseInstance!
        .from('membros')
        .insert([member]);
      if (error) throw error;
    },
    async deleteMember(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('membros')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    async getEventPhotos(): Promise<EventPhoto[]> {
      const { data, error } = await supabaseInstance!
        .from('fotos_evento')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) {
        console.error("Erro Supabase Photos:", error);
        return [];
      }
      return (data as EventPhoto[]) || [];
    },
    async addEventPhoto(photo: EventPhoto): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .insert([{ 
          id: photo.id, 
          url: photo.url, 
          createdAt: photo.createdAt 
        }]);
      if (error) throw error;
    },
    async deleteEventPhoto(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  };
};

export const databaseService = {
  isConfigured: () => !getProvider().isLocal,
  getMembers: () => getProvider().getMembers(),
  addMember: (m: Member) => getProvider().addMember(m),
  deleteMember: (id: string) => getProvider().deleteMember(id),
  getEventPhotos: () => getProvider().getEventPhotos(),
  addEventPhoto: (p: EventPhoto) => getProvider().addEventPhoto(p),
  deleteEventPhoto: (id: string) => getProvider().deleteEventPhoto(id)
};
