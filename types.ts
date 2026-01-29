
export interface Member {
  id: string;
  nome: string;
  bloco: string;
  apto: string;
  celular: string;
  slogan?: string;
  createdAt: number;
}

export enum ViewMode {
  HOME = 'HOME',
  REGISTER = 'REGISTER',
  LIST = 'LIST'
}
