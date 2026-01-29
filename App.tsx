
import React, { useState, useEffect, useMemo } from 'react';
import { Member, ViewMode } from './types';
import { generateCarnivalSlogan } from './services/geminiService';
import { 
  Users, 
  UserPlus, 
  Home, 
  Phone, 
  Building, 
  Music, 
  Search,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  Calendar,
  Download,
  Beer,
  Trophy
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBloco, setFilterBloco] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    bloco: 'BLOCO 1',
    apto: '',
    celular: ''
  });
  const [lastSlogan, setLastSlogan] = useState<string | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'celular') {
      setFormData(prev => ({ ...prev, [name]: maskPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.bloco || !formData.celular) return;

    setLoading(true);
    const slogan = await generateCarnivalSlogan(formData.nome, formData.bloco);
    
    const newMember: Member = {
      // Garantindo um ID robusto mesmo se randomUUID falhar
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      slogan,
      createdAt: Date.now()
    };

    setMembers(prev => [newMember, ...prev]);
    setLastSlogan(slogan);
    setLoading(false);
    setFormData({ nome: '', bloco: 'BLOCO 1', apto: '', celular: '' });
  };

  const removeMember = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este folião da escalação oficial?')) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const uniqueBlocos = useMemo(() => {
    return Array.from(new Set(members.map(m => m.bloco))).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesBloco = filterBloco === '' || m.bloco === filterBloco;
      const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.bloco.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBloco && matchesSearch;
    });
  }, [members, filterBloco, searchTerm]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const exportToCSV = () => {
    if (filteredMembers.length === 0) return;
    const headers = ["Nome", "Bloco", "Apto", "Celular", "Slogan", "Data de Cadastro"];
    const csvContent = [
      headers.join(","),
      ...filteredMembers.map(m => [
        `"${m.nome.replace(/"/g, '""')}"`,
        `"${m.bloco.replace(/"/g, '""')}"`,
        `"${(m.apto || "").replace(/"/g, '""')}"`,
        `"${m.celular.replace(/"/g, '""')}"`,
        `"${(m.slogan || "").replace(/"/g, '""')}"`,
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
      <header className="bg-arena-blue text-white py-8 px-4 shadow-2xl relative overflow-hidden border-b-8 border-arena-yellow">
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
          <div className="bg-white p-3 rounded-t-3xl border-x-8 border-t-8 border-arena-blue -mb-1 shadow-lg">
             <span className="text-arena-blue font-arena text-xl tracking-tighter">BLOCO</span>
          </div>
          <div className="bg-white px-8 py-4 rounded-3xl border-8 border-arena-blue flex flex-col items-center gap-1 shadow-2xl">
            <h1 className="text-arena-blue font-arena text-4xl md:text-5xl leading-tight text-center">
              DEIXA O <span className="text-arena-red block text-6xl md:text-7xl">ARENA</span> ME LEVAR
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Beer className="text-arena-yellow fill-arena-yellow" size={32} />
              <div className="bg-arena-red text-white px-4 py-1 rounded-full font-arena text-lg">ARENA PARK</div>
              <Trophy className="text-arena-blue" size={32} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-4xl px-4 py-12">
        {view === ViewMode.HOME && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            <button 
              onClick={() => { setView(ViewMode.REGISTER); setLastSlogan(null); }}
              className="arena-card p-10 hover:transform hover:-translate-y-2 transition-all group text-center"
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-blue group-hover:bg-arena-yellow transition-colors">
                <UserPlus size={48} className="text-arena-blue" />
              </div>
              <h2 className="text-3xl font-arena text-arena-blue mb-2">QUERO PARTICIPAR</h2>
              <p className="text-gray-600 font-semibold">Garanta sua vaga no melhor bloco do Arena Park!</p>
            </button>

            <button 
              onClick={() => setView(ViewMode.LIST)}
              className="arena-card p-10 hover:transform hover:-translate-y-2 transition-all group text-center border-arena-red"
              style={{ boxShadow: '8px 8px 0px var(--arena-blue)' }}
            >
              <div className="bg-arena-cream w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-arena-red group-hover:bg-arena-blue group-hover:text-white transition-colors">
                <Users size={48} className="text-arena-red group-hover:text-white" />
              </div>
              <h2 className="text-3xl font-arena text-arena-red mb-2">VER CONVOCADOS</h2>
              <p className="text-gray-600 font-semibold">Confira a escalação oficial da nossa bateria.</p>
            </button>
          </div>
        )}

        {view === ViewMode.REGISTER && (
          <div className="max-w-lg mx-auto arena-card overflow-hidden animate-slideUp">
            <div className="bg-arena-blue p-6 text-white text-center">
              <h2 className="text-3xl font-arena flex items-center justify-center gap-2 tracking-widest">
                <Sparkles size={24} className="text-arena-yellow" /> FICHA TÉCNICA
              </h2>
            </div>
            
            {lastSlogan ? (
              <div className="p-10 text-center animate-bounceIn">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500">
                  <Trophy size={48} />
                </div>
                <h3 className="text-3xl font-arena text-arena-blue mb-4">CONVOCADO COM SUCESSO!</h3>
                <div className="bg-arena-yellow/20 border-l-8 border-arena-yellow p-6 rounded-r-xl italic text-arena-blue font-bold text-lg mb-8">
                  "{lastSlogan}"
                </div>
                <button 
                  onClick={() => setLastSlogan(null)}
                  className="btn-arena w-full font-arena text-2xl py-4 rounded-2xl"
                >
                  NOVO CADASTRO
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                <div>
                  <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">NOME DO FOLIÃO</label>
                  <input required name="nome" value={formData.nome} onChange={handleInputChange} className={formInputStyles} placeholder="Nome Completo" />
                </div>
                <div>
                  <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">BLOCO NO CONDOMÍNIO</label>
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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">APTO</label>
                    <input name="apto" value={formData.apto} onChange={handleInputChange} className={formInputStyles} placeholder="Ex: 101" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-arena-blue mb-2 uppercase tracking-tighter">CELULAR</label>
                    <input required name="celular" value={formData.celular} onChange={handleInputChange} className={formInputStyles} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-arena font-arena text-2xl py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50">
                  {loading ? <><Loader2 className="animate-spin" /> PROCESSANDO...</> : <>CONFIRMAR ESCALAÇÃO <Music size={24}/></>}
                </button>
              </form>
            )}
          </div>
        )}

        {view === ViewMode.LIST && (
          <div className="arena-card overflow-hidden animate-fadeIn border-arena-blue">
            <div className="p-8 bg-arena-blue text-white space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-4xl font-arena flex items-center gap-3 shrink-0 tracking-widest">
                  <Users size={32} className="text-arena-yellow" /> CONVOCADOS ({filteredMembers.length})
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-arena-yellow" size={18} />
                    <select value={filterBloco} onChange={(e) => setFilterBloco(e.target.value)} className="w-full bg-blue-900/50 text-white border-2 border-arena-yellow rounded-xl py-3 pl-11 pr-10 outline-none appearance-none font-bold text-sm">
                      <option value="">TODOS OS BLOCOS</option>
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
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-arena-yellow" size={18} />
                    <input placeholder="BUSCAR FOLIÃO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-blue-900/50 text-white border-2 border-arena-yellow rounded-xl py-3 pl-11 pr-4 outline-none font-bold text-sm" />
                  </div>
                  <button onClick={exportToCSV} disabled={filteredMembers.length === 0} className="flex items-center justify-center gap-2 bg-arena-red hover:bg-red-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-arena text-lg transition-all shadow-lg border-2 border-white">
                    <Download size={20} /> EXPORTAR
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-arena-cream text-arena-blue uppercase text-xs font-black tracking-widest border-b-4 border-arena-blue">
                  <tr>
                    <th className="px-8 py-5">FOLIÃO / ESCALAÇÃO</th>
                    <th className="px-8 py-5">BLOCO</th>
                    <th className="px-8 py-5">CADASTRO</th>
                    <th className="px-8 py-5">CONTATO / APTO</th>
                    <th className="px-8 py-5 text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100">
                  {filteredMembers.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold italic text-xl">NENHUM FOLIÃO ESCALADO.</td></tr>
                  ) : (
                    filteredMembers.map(member => (
                      <tr key={member.id} className="transition-all duration-300 border-b border-gray-100 hover:bg-white hover:shadow-2xl">
                        <td className="px-8 py-6">
                          <div className="font-black text-arena-blue text-lg uppercase">{member.nome}</div>
                          <div className="text-sm text-arena-red font-bold italic mt-2 max-w-xs leading-tight">"{member.slogan}"</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1 bg-arena-blue text-white rounded-lg text-sm font-arena tracking-wider">{member.bloco}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-gray-500 flex items-center gap-2"><Calendar size={16} className="text-arena-blue" />{formatDate(member.createdAt)}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-black text-arena-blue flex items-center gap-2"><Phone size={16} className="text-arena-red" /> {member.celular}</div>
                          <div className="text-sm font-bold text-gray-400 flex items-center gap-2 mt-2 uppercase"><Building size={16} /> APTO: {member.apto || '---'}</div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button 
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="bg-gray-100 text-gray-400 hover:bg-arena-red hover:text-white transition-all p-3 rounded-2xl border-2 border-transparent hover:border-arena-blue"
                          >
                            <Trash2 size={22} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <nav className="bg-arena-blue border-t-4 border-arena-yellow p-4 sticky bottom-0 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button onClick={() => setView(ViewMode.HOME)} className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.HOME ? 'text-arena-yellow scale-110' : 'text-blue-300 hover:text-arena-yellow'}`}>
            <Home size={28} /><span className="text-[10px] font-black uppercase tracking-widest">INÍCIO</span>
          </button>
          <button onClick={() => { setView(ViewMode.REGISTER); setLastSlogan(null); }} className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.REGISTER ? 'text-arena-yellow scale-110' : 'text-blue-300 hover:text-arena-yellow'}`}>
            <UserPlus size={28} /><span className="text-[10px] font-black uppercase tracking-widest">CADASTRO</span>
          </button>
          <button onClick={() => setView(ViewMode.LIST)} className={`flex flex-col items-center gap-1 transition-all ${view === ViewMode.LIST ? 'text-arena-yellow scale-110' : 'text-blue-300 hover:text-arena-yellow'}`}>
            <Users size={28} /><span className="text-[10px] font-black uppercase tracking-widest">ESCALAÇÃO</span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23F9B115' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
        tr:hover { transform: translateY(-2px); z-index: 10; }
      `}} />
    </div>
  );
};

export default App;
