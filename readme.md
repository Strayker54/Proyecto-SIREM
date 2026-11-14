# SIREM (Sistema Inteligente de Regulación Emocional Musical - UIS)

Herramienta académica de apoyo técnico a profesionales de psicología, orientación y bienestar universitario para estructurar secuencias musicales personalizadas mediante criterios reproducibles de valencia y activación $(V, A)$ bajo el **Principio ISO** y el **Modelo Circumplejo de Russell** $[-1, 1]^2$, documentándolas en una Ficha Técnica institucional trazable.

## Equipo de Trabajo (Grupo 9 & Grupo 1 — Escuela de Ingeniería de Sistemas e Informática, UIS)
- **Andrés Santiago Marín Forero** – Dirección y Finanzas / Coordinación general
- **Anthoni Lexandre Hernández Díaz** – Arquitectura musical y algoritmos
- **Karol Yamile Palomino Prada** – Responsabilidad técnica y datos
- **Giselle Alejandra Vesga Romero** – Interfaz, ficha técnica y riesgos

## Arquitectura Modular del Repositorio
```text
Proyecto-SIREM/
├── config/
│   ├── schema_contract.json          # Contrato de datos JSON (1.284 pistas en [-1, 1]^2)
│   └── parameters.json               # Hiperparámetros calibrados (lambda, delta, beta)
├── supabase/
│   └── migrations/
│       └── 20261105_sirem_schema.sql # Esquema PostgreSQL de las 4 tablas de Supabase
├── docs/                             # Documentación técnica, diccionario y reportes
├── src/                              # Scripts Python de limpieza y motor algorítmico
├── tests/                            # Pruebas de verificación cruzada (CA1 a CA4)
└── frontend/                         # Aplicación web modular en React + TypeScript + Tailwind
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── types/sirem.ts
        ├── lib/supabaseClient.ts
        ├── services/mathEngine.ts
        ├── data/seedData.ts
        ├── components/
        │   ├── layout/ (Sidebar, HeaderBanner, LegalFooter)
        │   ├── shared/ (RussellPlane, KpiCard, TrackSwapModal)
        │   └── modules/ (GeneratorModule, TechnicalSheetModule, CatalogAuditModule, BenchmarkModule, UsabilityModule, SupabaseConfigModule)
        ├── App.tsx
        └── main.tsx
```

## Ejecución de la Aplicación Web (`frontend/`)
```bash
cd frontend
npm install
npx tsc --noEmit
npm run build
npm run dev
```
