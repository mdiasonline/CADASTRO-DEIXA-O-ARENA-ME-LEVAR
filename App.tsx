
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Member, ViewMode } from './types';
import { 
  Users, 
  UserPlus, 
  Home, 
  Phone, 
  Music, 
  Search,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  Download,
  Beer,
  Trophy,
  MessageCircle,
  Crown,
  Building,
  Camera,
  X,
  User
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBloco, setFilterBloco] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    bloco: 'BLOCO 1',
    tipo: 'FOLIÃO',
    apto: '',
    celular: '',
    photo: '' as string | undefined
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('carnival_members_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMembers(parsed);
      } catch (e) {
        console.error("Erro ao carregar membros:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('carnival_members_v2', JSON.stringify(members));
  }, [members]);

  const maskPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    return value.substring(0, 15);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'celular') {
      setFormData(prev => ({ ...prev, [name]: maskPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.bloco || !formData.celular) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      createdAt: Date.now()
    };

    setMembers(prev => [newMember, ...prev]);
    setIsRegistered(true);
    setLoading(false);
    setFormData({ nome: '', bloco: 'BLOCO 1', tipo: 'FOLIÃO', apto: '', celular: '', photo: undefined });
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesBloco = filterBloco === '' || m.bloco === filterBloco;
      const matchesTipo = filterTipo === '' || m.tipo === filterTipo;
      const matchesSearch = 
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.bloco.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBloco && matchesTipo && matchesSearch;
    });
  }, [members, filterBloco, filterTipo, searchTerm]);

  const formInputStyles = "w-full px-6 py-4 rounded-2xl border-4 border-arena-blue/20 bg-white/80 text-arena-blue placeholder-blue-300 focus:border-arena-blue outline-none transition-all text-lg font-bold appearance-none";

  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER SEM LOGO - TÍTULO SOLICITADO */}
      <header className="bg-arena-blue text-white py-10 shadow-2xl border-b-4 border-arena-yellow sticky top-0 z-50">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-arena tracking-widest leading-none">
            CADASTRO <span className="text-arena-yellow">DA ALEGRIA</span>
          </h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-12 relative z-20">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            <button 
              onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }}
              className="arena-card p-12 hover:transform hover:-translate-y-2 transition-all group text-center bg-white"
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-blue group-hover:bg-arena-yellow transition-all">
                <UserPlus size={48} className="text-arena-blue" />
              </div>
              <h2 className="text-3xl font-arena text-arena-blue mb-2">QUERO PARTICIPAR</h2>
              <p className="text-gray-600 font-bold">Faça sua inscrição agora!</p>
            </button>

            <button 
              onClick={() => setView(ViewMode.LIST)}
              className="arena-card p-12 hover:transform hover:-translate-y-2 transition-all group text-center bg-white"
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-red group-hover:bg-arena-blue transition-all">
                <Users size={48} className="text-arena-red group-hover:text-white" />
              </div>
              <h2 className="text-3xl font-arena text-arena-red mb-2">VER LISTA</h2>
              <p className="text-gray-600 font-bold">Veja quem já está na folia.</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-lg mx-auto arena-card overflow-hidden bg-white animate-slideUp">
            <div className="bg-arena-blue p-6 text-white text-center">
              <h2 className="text-3xl font-arena uppercase tracking-widest">FICHA DE INSCRIÇÃO</h2>
            </div>
            
            {isRegistered ? (
              <div className="p-10 text-center">
                <Trophy size={64} className="mx-auto text-arena-yellow mb-6" />
                <h3 className="text-3xl font-arena text-arena-blue mb-4">CADASTRO REALIZADO!</h3>
                <button 
                  onClick={() => setIsRegistered(false)}
                  className="btn-arena w-full font-arena text-xl py-4 rounded-xl"
                >
                  VOLTAR
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-arena-blue bg-gray-100 flex items-center justify-center overflow-hidden">
                      {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-arena-blue text-white p-2 rounded-full shadow-lg">
                      <Camera size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Tire uma selfie ou envie foto</p>
                </div>

                <input required name="nome" value={formData.nome} onChange={handleInputChange} className={formInputStyles} placeholder="NOME COMPLETO" />
                
                <div className="grid grid-cols-2 gap-4">
                   <select name="bloco" value={formData.bloco} onChange={handleInputChange} className={formInputStyles}>
                      {['BLOCO 1', 'BLOCO 2', 'BLOCO 3', 'BLOCO 4', 'CONVIDADO'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input name="apto" value={formData.apto} onChange={handleInputChange} className={formInputStyles} placeholder="APTO" />
                </div>

                <input required name="celular" value={formData.celular} onChange={handleInputChange} className={formInputStyles} placeholder="WHATSAPP (00) 00000-0000" />

                <button type="submit" disabled={loading} className="btn-arena w-full font-arena text-2xl py-4 rounded-2xl flex items-center justify-center gap-4">
                  {loading ? <Loader2 className="animate-spin" /> : "CONCLUIR"}
                </button>
              </form>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
          <div className="space-y-6 animate-fadeIn">
             <div className="flex items-center justify-between bg-white p-6 rounded-3xl border-4 border-arena-blue shadow-lg">
                <h2 className="text-3xl font-arena text-arena-blue">FOLIÕES</h2>
                <div className="flex gap-2">
                   <Search size={24} className="text-arena-blue" />
                   <input 
                    placeholder="BUSCAR..." 
                    className="border-b-2 border-arena-blue outline-none font-bold text-arena-blue"
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-2xl border-2 border-arena-blue flex items-center gap-4 shadow-md">
                    <div className="w-16 h-16 rounded-full border-2 border-arena-blue overflow-hidden shrink-0">
                      {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-300 w-full h-full" />}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-arena text-xl text-arena-blue">{m.nome}</h4>
                      <p className="text-xs font-bold text-gray-500 uppercase">{m.bloco} - APTO {m.apto || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                       <a href={`https://wa.me/55${m.celular.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-lg"><MessageCircle size={20} /></a>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* NAVEGAÇÃO */}
      <nav className="bg-arena-blue border-t-4 border-arena-yellow p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center ${view === ViewMode.HOME ? 'text-arena-yellow' : 'text-blue-200'}`}>
            <Home size={24} /> <span className="text-[10px] font-bold">HOME</span>
          </button>
          <button onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }} className={`flex flex-col items-center ${view === ViewMode.REGISTER ? 'text-arena-yellow' : 'text-blue-200'}`}>
            <UserPlus size={24} /> <span className="text-[10px] font-bold">CADASTRO</span>
          </button>
          <button onClick={() => setView(ViewMode.LIST)} className={`flex flex-col items-center ${view === ViewMode.LIST ? 'text-arena-yellow' : 'text-blue-200'}`}>
            <Users size={24} /> <span className="text-[10px] font-bold">LISTA</span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}} />
    </div>
  );
};

export default App;
