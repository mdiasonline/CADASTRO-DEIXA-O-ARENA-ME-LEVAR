
export interface Member {
  id: string;
  nome: string;
  bloco: string;
  tipo: string;
  apto: string;
  celular: string;
  photo?: string; // Base64 string of the selfie
  createdAt: number;
}

export interface EventPhoto {
  id: string;
  url: string; // Base64 or URL
  createdAt: number;
}

export interface Sponsor {
  id: string;
  nome: string;
  logo: string;
  atuacao: string;
  telefone: string;
  descricao?: string;
  createdAt: number;
}

export enum ViewMode {
  HOME = 'HOME',
  REGISTER = 'REGISTER',
  LIST = 'LIST',
  STATISTICS = 'STATISTICS',
  PHOTOS = 'PHOTOS',
  SPONSORS = 'SPONSORS'
}
