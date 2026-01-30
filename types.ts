
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

export enum ViewMode {
  HOME = 'HOME',
  REGISTER = 'REGISTER',
  LIST = 'LIST'
}
