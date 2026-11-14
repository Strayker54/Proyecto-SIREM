/**
 * Orquestador principal de la aplicación SIREM (UIS).
 * Gestiona el estado global del catálogo auditado, los parámetros de la trayectoria ISO
 * y la navegación limpia entre los 6 módulos funcionales.
 */

import { useMemo, useState } from 'react';
import type { ModuleId, OptimizationParams, SyntheticCase, Track } from './types/sirem';
import { buildAuditedCatalog, DEFAULT_PARAMS } from './data/seedData';
import { loadCustomCatalog, saveCustomCatalog } from './lib/supabaseClient';
import { Sidebar } from './components/layout/Sidebar';
import { HeaderBanner } from './components/layout/HeaderBanner';
import { LegalFooter } from './components/layout/LegalFooter';
import { GeneratorModule } from './components/modules/GeneratorModule';
import { TechnicalSheetModule } from './components/modules/TechnicalSheetModule';
import { CatalogAuditModule } from './components/modules/CatalogAuditModule';
import { BenchmarkModule } from './components/modules/BenchmarkModule';
import { UsabilityModule } from './components/modules/UsabilityModule';
import { SupabaseConfigModule } from './components/modules/SupabaseConfigModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('generator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const builtInCatalog = useMemo(() => buildAuditedCatalog(), []);
  const [customCatalog, setCustomCatalog] = useState<Track[] | null>(() => loadCustomCatalog());
  const activeCatalog = customCatalog ?? builtInCatalog;

  const [params, setParams] = useState<OptimizationParams>(DEFAULT_PARAMS);
  const [manualOverrideTracks, setManualOverrideTracks] = useState<Track[] | null>(null);

  const handleReplaceCatalog = (tracks: Track[] | null) => {
    setCustomCatalog(tracks);
    saveCustomCatalog(tracks);
    setManualOverrideTracks(null);
  };

  const handleLoadSyntheticCase = (sc: SyntheticCase) => {
    setManualOverrideTracks(null);
    setParams((prev) => ({
      ...prev,
      x_ini: { ...sc.x_ini },
      x_obj: { ...sc.x_obj },
      m: sc.m,
      sourceFilter: sc.sourceFilter,
      lambda: sc.lambda,
      delta: sc.delta,
      epsilon_ini: sc.epsilon_ini,
      epsilon_obj: sc.epsilon_obj,
    }));
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-slate-900">
      {/* Navegación lateral (escritorio y móvil) */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* Contenedor principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderBanner
          catalogCount={activeCatalog.length}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Vista del módulo activo */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeModule === 'generator' && (
            <GeneratorModule
              catalog={activeCatalog}
              params={params}
              onParamsChange={setParams}
              manualOverrideTracks={manualOverrideTracks}
              onManualOverrideChange={setManualOverrideTracks}
              onExportToFicha={() => setActiveModule('ficha')}
            />
          )}

          {activeModule === 'ficha' && (
            <TechnicalSheetModule
              catalog={activeCatalog}
              params={params}
              manualOverrideTracks={manualOverrideTracks}
              onLoadSyntheticCase={handleLoadSyntheticCase}
            />
          )}

          {activeModule === 'catalog' && (
            <CatalogAuditModule
              catalog={activeCatalog}
              isCustomCatalog={customCatalog !== null}
              onReplaceCatalog={handleReplaceCatalog}
            />
          )}

          {activeModule === 'benchmarks' && <BenchmarkModule catalog={activeCatalog} />}

          {activeModule === 'usability' && <UsabilityModule />}

          {activeModule === 'supabase' && (
            <SupabaseConfigModule
              catalog={activeCatalog}
              isCustomCatalog={customCatalog !== null}
            />
          )}
        </main>

        <LegalFooter />
      </div>
    </div>
  );
}
