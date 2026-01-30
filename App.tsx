
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
  Upload,
  X,
  User,
  Zap
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
    const saved = localStorage.getItem('carnival_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMembers(parsed);
        }
      } catch (e) {
        console.error("Erro ao carregar membros:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('carnival_members', JSON.stringify(members));
  }, [members]);

  const maskPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    return value.substring(0, 15);
  };

  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `https://wa.me/55${cleaned}`;
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

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photo: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.bloco || !formData.celular) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const newMember: Member = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      createdAt: Date.now()
    };

    setMembers(prev => [newMember, ...prev]);
    setIsRegistered(true);
    setLoading(false);
    setFormData({ nome: '', bloco: 'BLOCO 1', tipo: 'FOLIÃO', apto: '', celular: '', photo: undefined });
  };

  const removeMember = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este folião da escalação oficial?')) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesBloco = filterBloco === '' || m.bloco === filterBloco;
      const matchesTipo = filterTipo === '' || m.tipo === filterTipo;
      const matchesSearch = 
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.bloco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBloco && matchesTipo && matchesSearch;
    });
  }, [members, filterBloco, filterTipo, searchTerm]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const exportToCSV = () => {
    if (filteredMembers.length === 0) return;
    const headers = ["Nome", "Cargo", "Bloco", "Apto", "Celular", "Data de Cadastro"];
    const csvContent = [
      headers.join(","),
      ...filteredMembers.map(m => [
        `"${m.nome.replace(/"/g, '""')}"`,
        `"${m.tipo.replace(/"/g, '""')}"`,
        `"${m.bloco.replace(/"/g, '""')}"`,
        `"${(m.apto || "").replace(/"/g, '""')}"`,
        `"${m.celular.replace(/"/g, '""')}"`,
        formatDate(m.createdAt)
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `membros_arena_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formInputStyles = "w-full px-6 py-4 rounded-2xl border-4 border-arena-blue/20 bg-blue-900/40 text-white placeholder-blue-200 focus:border-arena-blue focus:ring-4 focus:ring-arena-blue/10 outline-none transition-all text-lg font-bold appearance-none";

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER ATUALIZADO SEM LOGO */}
      <header className="bg-arena-blue text-white py-8 shadow-2xl border-b-4 border-arena-yellow sticky top-0 z-40">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-arena tracking-widest leading-tight text-center">
            CADASTRO <span className="text-arena-yellow">DA ALEGRIA</span>
          </h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-8">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn mt-8">
            <button 
              onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }}
              className="arena-card p-10 hover:transform hover:-translate-y-2 transition-all group text-center"
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-blue group-hover:bg-arena-yellow group-hover:border-arena-red transition-all duration-300">
                <UserPlus size={48} strokeWidth={2.5} className="text-arena-blue group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h2 className="text-3xl font-arena text-arena-blue mb-2">QUERO PARTICIPAR</h2>
              <p className="text-gray-600 font-semibold">Garanta sua vaga no melhor bloco do Arena Park!</p>
            </button>

            <button 
              onClick={() => setView(ViewMode.LIST)}
              className="arena-card p-10 hover:transform hover:-translate-y-2 transition-all group text-center border-arena-red"
              style={{ boxShadow: '8px 8px 0px var(--arena-blue)' }}
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-red group-hover:bg-arena-blue transition-all duration-300">
                <Users size={48} strokeWidth={2.5} className="text-arena-red group-hover:text-white group-hover:scale-110 transition-all duration-300" />
              </div>
              <h2 className="text-3xl font-arena text-arena-red mb-2">VER CONVOCADOS</h2>
              <p className="text-gray-600 font-semibold">Confira a escalação oficial da nossa bateria.</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-lg mx-auto arena-card overflow-hidden animate-slideUp">
            <div className="bg-arena-blue p-6 text-white text-center">
              <h2 className="text-3xl font-arena flex items-center justify-center gap-2 tracking-widest uppercase">
                <Sparkles size={24} className="text-arena-yellow" /> FICHA TÉCNICA
              </h2>
            </div>
            
            {isRegistered ? (
              <div className="p-10 text-center animate-bounceIn">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500">
                  <Trophy size={48} />
                </div>
                <h3 className="text-3xl font-arena text-arena-blue mb-4 uppercase">CONVOCADO COM SUCESSO!</h3>
                <p className="text-gray-600 font-bold mb-8">Sua vaga na folia do Arena Park está garantida.</p>
                <button 
                  onClick={() => setIsRegistered(false)}
                  className="btn-arena w-full font-arena text-2xl py-4 rounded-2xl uppercase"
                >
                  NOVO CADASTRO
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                {/* SELFIE SECTION */}
                <div className="flex flex-col items-center gap-4">
                  <label className="block text-sm font-black text-arena-blue uppercase tracking-tighter self-start">SUA SELFIE OFICIAL</label>
                  <div className="relative group">
                    <div className="w-40 h-40 rounded-full border-8 border-arena-blue/10 bg-arena-cream flex items-center justify-center overflow-hidden transition-all group-hover:border-arena-yellow">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Selfie" className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} className="text-arena-blue/20" />
                      )}
                    </div>
                    {formData.photo && (
                      <button 
                        type="button" 
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-arena-red text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <X size={20} />
                      </button>
                    )}
                    <div className="absolute -bottom-2 -right-2 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-arena-blue text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors"
                        title="Enviar ou tirar foto"
                      >
                        <Camera size={24} />
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      capture="user" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Clique no ícone para tirar ou enviar sua foto</p>
                </div>

                <div>
                  <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">NOME DO FOLIÃO</label>
                  <input required name="nome" value={formData.nome} onChange={handleInputChange} className={formInputStyles} placeholder="Nome Completo" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">CARGO / FUNÇÃO</label>
                    <select name="tipo" value={formData.tipo} onChange={handleInputChange} className={formInputStyles}>
                      <option value="FOLIÃO">FOLIÃO</option>
                      <option value="BATERIA">BATERIA</option>
                      <option value="DIRETORIA">DIRETORIA</option>
                      <option value="RAINHA">RAINHA</option>
                      <option value="MUSA">MUSA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">BLOCO</label>
                    <select name="bloco" value={formData.bloco} onChange={handleInputChange} className={formInputStyles}>
                      <option value="BLOCO 1">BLOCO 1</option>
                      <option value="BLOCO 2">BLOCO 2</option>
                      <option value="BLOCO 3">BLOCO 3</option>
                      <option value="BLOCO 4">BLOCO 4</option>
                      <option value="BLOCO 5">BLOCO 5</option>
                      <option value="BLOCO 6">BLOCO 6</option>
                      <option value="BLOCO 7">BLOCO 7</option>
                      <option value="BLOCO 8">BLOCO 8</option>
                      <option value="CONVIDADO">CONVIDADO</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">APTO (OPCIONAL)</label>
                    <input name="apto" value={formData.apto} onChange={handleInputChange} className={formInputStyles} placeholder="Ex: 101-A" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">WHATSAPP</label>
                    <input required name="celular" value={formData.celular} onChange={handleInputChange} className={formInputStyles} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-arena w-full font-arena text-2xl py-6 rounded-2xl flex items-center justify-center gap-4 group uppercase"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>CONFIRMAR ESCALAÇÃO <Music className="group-hover:animate-bounce" /></>}
                </button>
              </form>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-4xl font-arena text-arena-blue uppercase">FOLIA CONFIRMADA</h2>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors">
                  <Download size={20} /> CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar folião..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-arena-blue/10 focus:border-arena-blue outline-none font-bold"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select 
                  value={filterBloco}
                  onChange={(e) => setFilterBloco(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-arena-blue/10 focus:border-arena-blue outline-none appearance-none font-bold"
                >
                  <option value="">Todos os Blocos</option>
                  <option value="BLOCO 1">BLOCO 1</option>
                  <option value="BLOCO 2">BLOCO 2</option>
                  <option value="BLOCO 3">BLOCO 3</option>
                  <option value="BLOCO 4">BLOCO 4</option>
                  <option value="BLOCO 5">BLOCO 5</option>
                  <option value="BLOCO 6">BLOCO 6</option>
                  <option value="BLOCO 7">BLOCO 7</option>
                  <option value="BLOCO 8">BLOCO 8</option>
                  <option value="CONVIDADO">CONVIDADO</option>
                </select>
              </div>
              <div className="relative">
                <Crown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select 
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-arena-blue/10 focus:border-arena-blue outline-none appearance-none font-bold"
                >
                  <option value="">Todas as Funções</option>
                  <option value="FOLIÃO">FOLIÃO</option>
                  <option value="BATERIA">BATERIA</option>
                  <option value="DIRETORIA">DIRETORIA</option>
                  <option value="RAINHA">RAINHA</option>
                  <option value="MUSA">MUSA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-4 border-dashed border-gray-200">
                  <Beer size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-xl text-gray-500 font-bold">Nenhum folião encontrado na concentração...</p>
                </div>
              ) : (
                filteredMembers.map(member => (
                  <div key={member.id} className="arena-card p-6 flex flex-col gap-4 group transition-all hover:border-arena-red">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      
                      {/* LADO ESQUERDO: INFO PRINCIPAL */}
                      <div className="flex items-center gap-4 flex-grow">
                        <div className="w-16 h-16 bg-arena-blue/5 rounded-full flex items-center justify-center text-arena-blue border-2 border-arena-blue/10 shrink-0 overflow-hidden">
                          {member.photo ? (
                            <img src={member.photo} alt={member.nome} className="w-full h-full object-cover" />
                          ) : (
                            member.tipo === 'DIRETORIA' ? <Crown size={32} /> : member.tipo === 'BATERIA' ? <Music size={32} /> : <Users size={32} />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-black text-arena-blue uppercase leading-tight">{member.nome}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-arena-yellow text-arena-blue text-[10px] font-black rounded uppercase tracking-widest border border-arena-blue/10">
                              {member.tipo}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* LADO DIREITO: AÇÕES */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <a 
                          href={getWhatsAppLink(member.celular)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-md font-bold text-sm"
                        >
                          <MessageCircle size={20} /> WHATSAPP
                        </a>
                        <button 
                          onClick={() => removeMember(member.id)}
                          className="p-3 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Remover"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    </div>

                    {/* RODAPÉ DO CARD: TODOS OS CAMPOS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 mt-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="bg-arena-blue/10 p-2 rounded-lg text-arena-blue">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 leading-none">Bloco</p>
                          <p className="font-bold text-arena-blue uppercase">{member.bloco}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="bg-arena-blue/10 p-2 rounded-lg text-arena-blue">
                          <Building size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 leading-none">Apartamento</p>
                          <p className="font-bold text-arena-blue uppercase">{member.apto || 'NÃO INFORMADO'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="bg-arena-blue/10 p-2 rounded-lg text-arena-blue">
                          <Phone size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 leading-none">Contato</p>
                          <p className="font-bold text-arena-blue">{member.celular}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* MENU INFERIOR FIXO */}
      <nav className="bg-arena-blue border-t-4 border-arena-yellow p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setView(ViewMode.HOME)} 
            className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.HOME ? 'text-arena-yellow scale-110' : 'text-blue-200 hover:text-arena-yellow'}`}
          >
            <Home size={28} />
            <span className="text-[10px] font-black uppercase tracking-widest font-arena">INÍCIO</span>
          </button>
          <button 
            onClick={() => { setView(ViewMode.REGISTER); setIsRegistered(false); }} 
            className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.REGISTER ? 'text-arena-yellow scale-110' : 'text-blue-200 hover:text-arena-yellow'}`}
          >
            <UserPlus size={28} />
            <span className="text-[10px] font-black uppercase tracking-widest font-arena">CADASTRO</span>
          </button>
          <button 
            onClick={() => setView(ViewMode.LIST)} 
            className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.LIST ? 'text-arena-yellow scale-110' : 'text-blue-200 hover:text-arena-yellow'}`}
          >
            <Users size={28} />
            <span className="text-[10px] font-black uppercase tracking-widest font-arena">ESCALAÇÃO</span>
          </button>
        </div>
      </nav>

      <footer className="bg-arena-blue/90 py-6 px-4 text-center border-t border-white/10">
        <p className="text-arena-yellow font-arena text-lg tracking-widest mb-1 uppercase">ARENA PARK CARNAVAL 2026</p>
        <p className="text-white/40 font-bold text-[10px] uppercase tracking-tighter">Onde a alegria encontra o condomínio.</p>
      </footer>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23F9B115' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
      `}} />
    </div>
  );
};

export default App;
