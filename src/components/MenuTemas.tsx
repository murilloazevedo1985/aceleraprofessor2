import React, { useState } from 'react';

interface MenuTemasProps {
  onSelectTheme: (themeName: string) => void;
}

export function MenuTemas({ onSelectTheme }: MenuTemasProps) {
  const [currentSelection, setCurrentSelection] = useState<string>("Selecione um tema");
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  const handleSelect = (category: string, subTopic: string) => {
    const fullName = `${category} > ${subTopic}`;
    setCurrentSelection(fullName);
    onSelectTheme(fullName);
    
    setIsOpen(false);
    setActiveCategory('');
  };

  return (
    <div className="mb-6 w-full max-w-lg">
      <label className="block text-slate-700 font-bold mb-2">
        Tema da Aula (Seletor Hierárquico):
      </label>
      
      <div className="relative inline-block w-full">
        
        {/* Botão principal */}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="main-dropdown"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-800 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {currentSelection}
          <span className={`ml-2 shrink-0 text-xs text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}>
            &#9660;
          </span>
        </button>

        {/* Dropdown Principal */}
        <div id="main-dropdown" className={`${isOpen ? 'block' : 'hidden'} absolute left-0 top-full z-[100] w-full pt-2`}>
          
          <ul className="max-h-[70vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl animate-in fade-in duration-200 md:max-h-none md:overflow-visible">
            
            {/* Categoria 1: Mecânica */}
            <li className="relative group/sub px-1">
              <button type="button" aria-expanded={activeCategory === 'Mecânica'} onClick={() => setActiveCategory(activeCategory === 'Mecânica' ? '' : 'Mecânica')} className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                Mecânica <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </button>
              <ul className={`${activeCategory === 'Mecânica' ? 'block' : 'hidden'} relative w-full rounded-xl border border-slate-200 bg-white py-2 md:absolute md:left-full md:top-0 md:ml-[-1px] md:w-max md:min-w-[250px] md:rounded-2xl md:shadow-2xl md:group-hover/sub:block`}>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Cinemática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Cinemática</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Dinâmica (Leis de Newton)')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Dinâmica (Leis de Newton)</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Trabalho, Energia e Potência')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Trabalho, Energia e Potência</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Impulso, Quantidade de Movimento e Colisões')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Impulso, Quantidade de Movimento e Colisões</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Estática e Equilíbrio')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Estática e Equilíbrio</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Hidrostática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Hidrostática</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Gravitação Universal')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Gravitação Universal</button></li>
              </ul>
            </li>

            {/* Categoria 2: Termologia */}
            <li className="relative group/sub px-1">
              <button type="button" aria-expanded={activeCategory === 'Termologia'} onClick={() => setActiveCategory(activeCategory === 'Termologia' ? '' : 'Termologia')} className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                Termologia <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </button>
              <ul className={`${activeCategory === 'Termologia' ? 'block' : 'hidden'} relative w-full rounded-xl border border-slate-200 bg-white py-2 md:absolute md:left-full md:top-0 md:ml-[-1px] md:w-max md:min-w-[250px] md:rounded-2xl md:shadow-2xl md:group-hover/sub:block`}>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Termometria')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Termometria</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Calorimetria')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Calorimetria</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Gases Ideais')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Gases Ideais</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Termodinâmica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Termodinâmica</button></li>
              </ul>
            </li>

            {/* Categoria 3: Óptica e Ondulatória */}
            <li className="relative group/sub px-1">
              <button type="button" aria-expanded={activeCategory === 'Óptica e Ondulatória'} onClick={() => setActiveCategory(activeCategory === 'Óptica e Ondulatória' ? '' : 'Óptica e Ondulatória')} className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                Óptica e Ondulatória <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </button>
              <ul className={`${activeCategory === 'Óptica e Ondulatória' ? 'block' : 'hidden'} relative w-full rounded-xl border border-slate-200 bg-white py-2 md:absolute md:left-full md:top-0 md:ml-[-1px] md:w-max md:min-w-[250px] md:rounded-2xl md:shadow-2xl md:group-hover/sub:block`}>
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Óptica Geométrica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Óptica Geométrica</button></li>
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Fenômenos Ondulatórios')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Fenômenos Ondulatórios</button></li>
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Acústica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Acústica</button></li>
              </ul>
            </li>

            {/* Categoria 4: Eletromagnetismo */}
            <li className="relative group/sub px-1">
              <button type="button" aria-expanded={activeCategory === 'Eletromagnetismo'} onClick={() => setActiveCategory(activeCategory === 'Eletromagnetismo' ? '' : 'Eletromagnetismo')} className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                Eletromagnetismo <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </button>
              <ul className={`${activeCategory === 'Eletromagnetismo' ? 'block' : 'hidden'} relative w-full rounded-xl border border-slate-200 bg-white py-2 md:absolute md:left-full md:top-0 md:ml-[-1px] md:w-max md:min-w-[250px] md:rounded-2xl md:shadow-2xl md:group-hover/sub:block`}>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Eletrostática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Eletrostática</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Eletrodinâmica (Circuitos)')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Eletrodinâmica (Circuitos)</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Magnetismo')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Magnetismo</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Indução Eletromagnética')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Indução Eletromagnética</button></li>
              </ul>
            </li>

            {/* Categoria 5: Física Moderna */}
            <li className="relative group/sub px-1">
              <button type="button" aria-expanded={activeCategory === 'Física Moderna'} onClick={() => setActiveCategory(activeCategory === 'Física Moderna' ? '' : 'Física Moderna')} className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                Física Moderna <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </button>
              <ul className={`${activeCategory === 'Física Moderna' ? 'block' : 'hidden'} relative w-full rounded-xl border border-slate-200 bg-white py-2 md:absolute md:left-full md:top-0 md:ml-[-1px] md:w-max md:min-w-[250px] md:rounded-2xl md:shadow-2xl md:group-hover/sub:block`}>
                <li><button type="button" onClick={() => handleSelect('Física Moderna', 'Relatividade (Especial e Geral)')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Relatividade (Especial e Geral)</button></li>
                <li><button type="button" onClick={() => handleSelect('Física Moderna', 'Física Quântica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Física Quântica</button></li>
                <li><button type="button" onClick={() => handleSelect('Física Moderna', 'Física Nuclear e Radioatividade')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Física Nuclear e Radioatividade</button></li>
                <li><button type="button" onClick={() => handleSelect('Física Moderna', 'Modelo Padrão e Partículas')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Modelo Padrão e Partículas</button></li>
              </ul>
            </li>

          </ul>
        </div>
      </div>
    </div>
  );
}