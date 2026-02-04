
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Member, EventPhoto, Sponsor, AppUser } from "../types";

interface DBProvider {
  getMembers(): Promise<Member[]>;
  addMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
  getEventPhotos(): Promise<EventPhoto[]>;
  addEventPhoto(photo: EventPhoto): Promise<void>;
  deleteEventPhoto(id: string): Promise<void>;
  getSponsors(): Promise<Sponsor[]>;
  addSponsor(sponsor: Sponsor): Promise<void>;
  updateSponsor(sponsor: Sponsor): Promise<void>;
  deleteSponsor(id: string): Promise<void>;
  // Métodos de Usuário
  getUsers(): Promise<AppUser[]>;
  addUser(user: AppUser): Promise<void>;
  updateUser(user: AppUser): Promise<void>;
  deleteUser(id: string): Promise<void>;
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
  },
  async getSponsors(): Promise<Sponsor[]> {
    const data = localStorage.getItem('carnaval_sponsors');
    return data ? JSON.parse(data) : [];
  },
  async addSponsor(sponsor: Sponsor): Promise<void> {
    const sponsors = await this.getSponsors();
    localStorage.setItem('carnaval_sponsors', JSON.stringify([sponsor, ...sponsors]));
  },
  async updateSponsor(sponsor: Sponsor): Promise<void> {
    const sponsors = await this.getSponsors();
    const index = sponsors.findIndex(s => s.id === sponsor.id);
    if (index !== -1) {
      sponsors[index] = sponsor;
      localStorage.setItem('carnaval_sponsors', JSON.stringify(sponsors));
    }
  },
  async deleteSponsor(id: string): Promise<void> {
    const sponsors = await this.getSponsors();
    const filtered = sponsors.filter(s => s.id !== id);
    localStorage.setItem('carnaval_sponsors', JSON.stringify(filtered));
  },
  // Usuários Local
  async getUsers(): Promise<AppUser[]> {
    const data = localStorage.getItem('platform_users');
    return data ? JSON.parse(data) : [];
  },
  async addUser(user: AppUser): Promise<void> {
    const users = await this.getUsers();
    localStorage.setItem('platform_users', JSON.stringify([...users, user]));
  },
  async updateUser(user: AppUser): Promise<void> {
    const users = await this.getUsers();
    const updated = users.map(u => u.id === user.id ? user : u);
    localStorage.setItem('platform_users', JSON.stringify(updated));
  },
  async deleteUser(id: string): Promise<void> {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    localStorage.setItem('platform_users', JSON.stringify(filtered));
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
      if (error) return [];
      return (data as EventPhoto[]) || [];
    },
    async addEventPhoto(photo: EventPhoto): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .insert([photo]);
      if (error) throw error;
    },
    async deleteEventPhoto(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('fotos_evento')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    async getSponsors(): Promise<Sponsor[]> {
      const { data, error } = await supabaseInstance!
        .from('patrocinadores')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) return [];
      return (data as Sponsor[]) || [];
    },
    async addSponsor(sponsor: Sponsor): Promise<void> {
      const { error } = await supabaseInstance!
        .from('patrocinadores')
        .insert([sponsor]);
      if (error) throw error;
    },
    async updateSponsor(sponsor: Sponsor): Promise<void> {
      const { id, ...dataToUpdate } = sponsor;
      const { error } = await supabaseInstance!
        .from('patrocinadores')
        .update(dataToUpdate)
        .eq('id', id);
      if (error) throw error;
    },
    async deleteSponsor(id: string): Promise<void> {
      const { error } = await supabaseInstance!
        .from('patrocinadores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    // Usuários Supabase
    async getUsers(): Promise<AppUser[]> {
      const { data, error } = await supabaseInstance!.from('usuarios_plataforma').select('*');
      if (error) throw error;
      return data || [];
    },
    async addUser(user: AppUser): Promise<void> {
      const { error } = await supabaseInstance!.from('usuarios_plataforma').insert([user]);
      if (error) throw error;
    },
    async updateUser(user: AppUser): Promise<void> {
      const { id, ...data } = user;
      const { error } = await supabaseInstance!.from('usuarios_plataforma').update(data).eq('id', id);
      if (error) throw error;
    },
    async deleteUser(id: string): Promise<void> {
      const { error } = await supabaseInstance!.from('usuarios_plataforma').delete().eq('id', id);
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
  deleteEventPhoto: (id: string) => getProvider().deleteEventPhoto(id),
  getSponsors: () => getProvider().getSponsors(),
  addSponsor: (s: Sponsor) => getProvider().addSponsor(s),
  updateSponsor: (s: Sponsor) => getProvider().updateSponsor(s),
  deleteSponsor: (id: string) => getProvider().deleteSponsor(id),
  // Usuários
  getUsers: () => getProvider().getUsers(),
  addUser: (u: AppUser) => getProvider().addUser(u),
  updateUser: (u: AppUser) => getProvider().updateUser(u),
  deleteUser: (id: string) => getProvider().deleteUser(id)
};
