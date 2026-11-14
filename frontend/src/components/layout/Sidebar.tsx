/**
 * Barra lateral de navegación principal (escritorio y cajón móvil) entre los 6 módulos de SIREM.
 */

import React from 'react';
import {
  BarChart3,
  Clock,
  Compass,
  Database,
  FileText,
  Server,
  X,
} from 'lucide-react';
import type { ModuleId } from '../../types/sirem';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

interface NavItem {
  id: ModuleId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'generator',
    label: 'Generador y Plano',
    subtitle: 'Principio ISO · Russell [-1, 1]²',
    icon: Compass,
  },
  {
    id: 'ficha',
    label: 'Ficha Técnica (CA4)',
    subtitle: 'Exportable · 20 Casos Sintéticos',
    icon: FileText,
  },
  {
    id: 'catalog',
    label: 'Catálogo Auditado (CA1)',
    subtitle: '1.284 pistas · Contrato JSON',
    icon: Database,
  },
  {
    id: 'benchmarks',
    label: 'Evaluación 30 Esc. (CA2/3)',
    subtitle: 'Comparativa y Latencia P95',
    icon: BarChart3,
  },
  {
    id: 'usability',
    label: 'Usabilidad y MGA (CA5)',
    subtitle: 'Consentimiento · Umbral 19,2 min',
    icon: Clock,
  },
  {
    id: 'supabase',
    label: 'Supabase y Estado',
    subtitle: 'Persistencia local o remota',
    icon: Server,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  mobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const handleSelect = (id: ModuleId) => {
    onSelectModule(id);
    onCloseMobileMenu();
  };

  return (
    <>
      {/* Navegación lateral de escritorio */}
      <aside
        aria-label="Navegación principal de módulos SIREM"
        className="no-print hidden lg:flex lg:flex-col w-64 shrink-0 bg-[#1B4332] text-white border-r border-[#143326]"
      >
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#67B93E] flex items-center justify-center text-[#1B4332] font-bold font-display text-sm shrink-0">
              UIS
            </div>
            <div>
              <div className="text-base font-bold font-display tracking-tight leading-none">
                SIREM
              </div>
              <div className="text-[11px] text-emerald-100/80 mt-1">
                Ciencia de Datos · EISI
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                data-testid={`nav-${item.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1B4332]'
                    : 'text-emerald-50/90 hover:bg-white/10'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-[#1B4332]' : 'text-[#67B93E]'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{item.label}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-slate-600' : 'text-emerald-100/70'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 text-[11px] text-emerald-100/80 space-y-1.5">
          <div className="font-semibold text-white">Marco Normativo Activo</div>
          <p className="leading-relaxed">
            Ley 23 de 1982 (sin audio MP3/WAV ni letras) · Ley 1581 de 2012 (casos seudonimizados).
          </p>
        </div>
      </aside>

      {/* Cajón de navegación móvil */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobileMenu}
          />
          <aside className="relative w-72 max-w-full bg-[#1B4332] text-white flex flex-col h-full z-10">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="font-bold font-display text-base">SIREM · UIS</div>
              <button
                type="button"
                onClick={onCloseMobileMenu}
                aria-label="Cerrar menú de navegación"
                className="p-1.5 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 ${
                      isActive
                        ? 'bg-white text-[#1B4332]'
                        : 'text-emerald-50 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div
                        className={`text-[11px] ${
                          isActive ? 'text-slate-600' : 'text-emerald-100/70'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};
