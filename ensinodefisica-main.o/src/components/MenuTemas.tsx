import React, { useState } from 'react';

interface MenuTemasProps {
  onSelectTheme: (themeName: string) => void;
}

export function MenuTemas({ onSelectTheme }: MenuTemasProps) {
  const [currentSelection, setCurrentSelection] = useState<string>("Selecione um tema");
  
  // 🔥 NOVO ESTADO: Controla se o hover do Tailwind está ativo ou não
  const [isHoverEnabled, setIsHoverEnabled] = useState(true);

  const handleSelect = (category: string, subTopic: string) => {
    const fullName = `${category} > ${subTopic}`;
    setCurrentSelection(fullName);
    onSelectTheme(fullName);
    
    // Desliga a classe de hover do Tailwind para forçar o menu a sumir imediatamente
    setIsHoverEnabled(false);
  };

  return (
    <div className="mb-6 w-full max-w-lg">
      <label className="block text-slate-700 font-bold mb-2">
        Tema da Aula (Seletor Hierárquico):
      </label>
      
      {/* Container Principal do Menu */}
      {/* 🔥 A MÁGICA ACONTECE AQUI: Alternamos a classe 'group/main' e religamos no onMouseEnter */}
      <div 
        className={`relative inline-block w-full ${isHoverEnabled ? 'group/main' : ''}`}
        onMouseEnter={() => setIsHoverEnabled(true)}
      >
        
        {/* Botão principal */}
        <button type="button" className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 py-3 px-4 rounded-xl shadow-sm inline-flex items-center justify-between w-full transition-all group-hover/main:border-indigo-300 group-hover/main:ring-2 group-hover/main:ring-indigo-100">
          {currentSelection}
          <span className="ml-2 text-xs text-slate-400 group-hover/main:text-indigo-500 group-hover/main:rotate-180 transition-transform">
            &#9660;
          </span>
        </button>

        {/* Dropdown Principal */}
        <div id="main-dropdown" className="absolute left-0 top-full w-full hidden group-hover/main:block z-[100] pt-2">
          
          <ul className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full py-2 animate-in fade-in duration-200">
            
            {/* Categoria 1: Mecânica */}
            <li className="relative group/sub px-1">
              <div className="flex justify-between items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg cursor-default">
                Mecânica <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </div>
              <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white border border-slate-200 shadow-2xl rounded-2xl min-w-[250px] z-[101] py-2 ml-[-1px]">
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Cinemática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Cinemática</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Dinâmica (Leis de Newton)')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Dinâmica (Leis de Newton)</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Estática e Equilíbrio')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Estática e Equilíbrio</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Hidrostática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Hidrostática</button></li>
                <li><button type="button" onClick={() => handleSelect('Mecânica', 'Gravitação Universal')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Gravitação Universal</button></li>
              </ul>
            </li>

            {/* Categoria 2: Termologia */}
            <li className="relative group/sub px-1">
              <div className="flex justify-between items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg cursor-default">
                Termologia <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </div>
              <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white border border-slate-200 shadow-2xl rounded-2xl min-w-[250px] z-[101] py-2 ml-[-1px]">
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Termometria')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Termometria</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Calorimetria')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Calorimetria</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Gases Ideais')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Gases Ideais</button></li>
                <li><button type="button" onClick={() => handleSelect('Termologia', 'Termodinâmica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Termodinâmica</button></li>
              </ul>
            </li>

            {/* Categoria 3: Óptica e Ondulatória */}
            <li className="relative group/sub px-1">
              <div className="flex justify-between items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg cursor-default">
                Óptica e Ondulatória <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </div>
              <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white border border-slate-200 shadow-2xl rounded-2xl min-w-[250px] z-[101] py-2 ml-[-1px]">
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Óptica Geométrica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Óptica Geométrica</button></li>
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Fenômenos Ondulatórios')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Fenômenos Ondulatórios</button></li>
                <li><button type="button" onClick={() => handleSelect('Óptica e Ondulatória', 'Acústica')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Acústica</button></li>
              </ul>
            </li>

            {/* Categoria 4: Eletromagnetismo */}
            <li className="relative group/sub px-1">
              <div className="flex justify-between items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg cursor-default">
                Eletromagnetismo <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </div>
              <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white border border-slate-200 shadow-2xl rounded-2xl min-w-[250px] z-[101] py-2 ml-[-1px]">
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Eletrostática')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Eletrostática</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Eletrodinâmica (Circuitos)')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Eletrodinâmica (Circuitos)</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Magnetismo')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Magnetismo</button></li>
                <li><button type="button" onClick={() => handleSelect('Eletromagnetismo', 'Indução Eletromagnética')} className="block w-full text-left px-5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg">Indução Eletromagnética</button></li>
              </ul>
            </li>

            {/* Categoria 5: Física Moderna */}
            <li className="relative group/sub px-1">
              <div className="flex justify-between items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-lg cursor-default">
                Física Moderna <span className="text-xl leading-none text-slate-400 group-hover/sub:text-indigo-500">&rsaquo;</span>
              </div>
              <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white border border-slate-200 shadow-2xl rounded-2xl min-w-[250px] z-[101] py-2 ml-[-1px]">
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