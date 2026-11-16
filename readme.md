# SIREM — Sistema Inteligente de Regulación Emocional Musical (UIS)

Herramienta académica de apoyo técnico a profesionales de psicología, orientación y bienestar universitario para estructurar secuencias musicales personalizadas mediante criterios reproducibles de valencia y activación $(V, A)$ bajo el **Principio ISO** y el **Modelo Circumplejo de Russell** $[-1, 1]^2$, documentándolas en una Ficha Técnica institucional trazable.

> **Alcance de apoyo no clínico y cumplimiento normativo:** SIREM documenta parámetros geométricos en el espacio $(V, A)$ sobre anotaciones psicométricas publicadas (DEAM y PMEmo); no emite diagnósticos clínicos, no sustituye el juicio del profesional ni garantiza eficacia terapéutica. Cumple con la **Ley 23 de 1982** (sin almacenamiento ni distribución de archivos de audio MP3/WAV; uso exclusivo de metadatos y enlaces externos verificados) y la **Ley 1581 de 2012** (identificadores seudonimizados libres de datos personales sensibles).

---

## Equipo de Trabajo (Escuela de Ingeniería de Sistemas e Informática — UIS)
- **Andrés Santiago Marín Forero** (`2243556`) — Dirección, Finanzas, Cronograma y Línea Base MGA
- **Anthoni Lexandre Hernández Díaz** (`2191198`) — Arquitectura Musical y Motor Algorítmico (Dijkstra / Markov)
- **Karol Yamile Palomino Prada** (`2243579`) — Ingeniería de Datos, Limpieza y Normalización (DEAM + PMEmo)
- **Giselle Alejandra Vesga Romero** (`2243603`) — Interfaz Web, Ficha Técnica, Usabilidad y Gestión de Riesgos
- **Docente Directora:** Ing. Sylvia Carolina Mesa Morales

---

## Presentación Oficial de Sustentación (`14 Diapositivas`)

El archivo de sustentación final del proyecto se encuentra disponible en la carpeta documental del repositorio:

- 📊 **[Presentación del Proyecto)](docs/SIREM_Sustentacion_14_diapositivas.pdf)** *(PowerPoint `.pdf` con las 14 diapositivas oficiales, gráficas de resultados y notas de orador detalladas por lámina)*.

| Diapositivas | Bloque Temático de Sustentación | Contenido Principal y Evidencia Asociada |
| :---: | :--- | :--- |
| **`01 – 03`** | **Contexto, Problema y Fundamento Teórico** | Propósito operativo (35 min $\rightarrow$ 5 min por guía), Modelo Circumplejo de Russell $[-1, 1]^2$ y los 3 momentos geométricos del Principio ISO ($\varepsilon_{\text{ini}}$, paso $\delta$, $\varepsilon_{\text{obj}}$). |
| **`04 – 06`** | **Arquitectura e Ingeniería de Datos (`CA1`)** | Arquitectura híbrida (`Python` + `React 19 / TypeScript` + `Supabase PostgreSQL`), cumplimiento normativo (Leyes 23/1982, 1581/2012 y SST), catálogo de 1.284 registros y auditoría en las 5 dimensiones de calidad de datos. |
| **`07 – 10`** | **Motor Matemático, Aplicativo Web y Validación (`CA2–CA4`)** | Formulación de $J(P)$, motor dual (Dijkstra por etapas vs. Cadenas de Markov-Boltzmann), flujo de 3 pasos en la aplicación web, 30 escenarios experimentales, 100 corridas de latencia y 20 fichas sintéticas (`20/20 all_passed`). |
| **`11 – 14`** | **Evaluación Económica MGA, Sensibilidad, Cierre y Conclusiones (`CA5`)** | Evaluación financiera a 4 años ($9{,}0\%\text{ E.A.}$, VPN y TIR en escenario SC-01 y cierre Excel/Project), análisis de sensibilidad, riesgos (VME), medidas SST, conciliación de 72 h en MS Project y conclusiones generales. |

---

## Matriz de Trazabilidad Académica (`CA1` a `CA5` — Guías 1 a 7 UIS)

| Criterio | Requisito Académico y Umbral de Aceptación | Scripts Python (`src/`) | Pruebas Automatizadas (`tests/`) | Evidencias y Reportes (`docs/` y `data/`) | Módulos React + TypeScript (`frontend/src/`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CA1`** | Catálogo integrado y normalizado $\ge 500$ pistas en $[-1, 1]^2$ con 0% faltantes (**1.284 pistas**: 522 DEAM + 762 PMEmo a partir de 2.596 brutos). | `src/data_cleaning.py`<br>`src/data_loader.py` | `tests/test_ca1_catalog.py` | `data/catalogo_sirem_1284.csv`<br>`frontend/src/data/catalog_1284.json`<br>`docs/diccionario_datos_v1.md`<br>`docs/reporte_auditoria_ca1.md`<br>`config/schema_contract.json` | `CatalogAuditModule.tsx`<br>`SupabaseConfigModule.tsx`<br>`seedData.ts` |
| **`CA2`** | Consistencia algorítmica del Principio ISO en **30 escenarios** de prueba: $\ge 90\%$ válidos (**30/30 = 100%**) cumpliendo $d_{\max}(P) \le \delta$, $\lVert x_1 - x_{\text{ini}} \rVert_2 \le \varepsilon_{\text{ini}}$, $e_{\text{obj}}(P) \le \varepsilon_{\text{obj}}$ y unicidad de pistas, superando a las líneas base en costo $J(P)$. | `src/routing_engine.py`<br>`src/engine/dijkstra.py`<br>`src/engine/markov.py`<br>`src/engine/baselines.py`<br>`src/engine/metrics.py` | `tests/test_ca2_ca3_benchmarks.py`<br>`tests/test_engine.py` | `docs/reporte_30_escenarios_ca2.csv`<br>`docs/reporte_30_escenarios_ca2.md`<br>`config/parameters.json` | `GeneratorModule.tsx`<br>`BenchmarkModule.tsx`<br>`RussellPlane.tsx`<br>`mathEngine.ts` |
| **`CA3`** | Desempeño computacional sobre **100 ejecuciones** consecutivas: percentil 95 de latencia $\text{P95} \le 2{,}0\text{ s}$ ($\le 2000\text{ ms}$, observado $\text{P95} = 0{,}48\text{ s}$) por secuencia de $m \in [4, 8]$ pistas. | `src/routing_engine.py` | `tests/test_ca2_ca3_benchmarks.py`<br>`tests/test_performance.py` | `docs/benchmark_100_corridas_ca3.csv` | `BenchmarkModule.tsx`<br>`KpiCard.tsx` |
| **`CA4`** | Generación, completitud y exportación (JSON, CSV, HTML e Impresión/PDF) de **20 casos sintéticos** seudonimizados (`SIREM-SYN-01` a `SIREM-SYN-20`) con 100% de enlaces externos válidos y sustitución controlada de pistas (Mitigación R3). | `src/ficha_exporter.py`<br>`src/exporter/json_csv_exporter.py`<br>`src/exporter/pdf_generator.py` | `tests/test_ca4_synthetic_20.py`<br>`tests/test_integration.py` | `docs/fichas_sinteticas/SIREM-SYN-01.json` … `SIREM-SYN-20.json`<br>`docs/verificacion_20_fichas_ca4.csv` | `TechnicalSheetModule.tsx`<br>`TrackSwapModal.tsx` |
| **`CA5`** | Validación de usabilidad con consentimiento informado obligatorio (Mitigación R5), cronometraje pareado en 10 participantes (`EVAL-01` a `EVAL-10`, mediana asistida $\le 5{,}0\text{ min}$, ahorro observado $30{,}55\text{ min/guía}$) y contraste frente al equilibrio económico MGA ($19{,}20\text{ min}$ en línea base original de 7.375.000 COP y $19{,}29\text{ min}$ en línea base actualizada SC-01 de 7.465.000 COP al $9{,}0\%\text{ E.A.}$). | `src/app_streamlit.py`<br>`src/ui/ficha_view.py` | `tests/test_integration.py` | `docs/protocolo_consentimiento_ca5.md`<br>`docs/resultados_usabilidad_ca5.csv` | `UsabilityModule.tsx`<br>`SupabaseConfigModule.tsx` |

---

## Arquitectura del Repositorio

```text
Proyecto-SIREM/
├── .env.example                      # Plantilla de las 3 credenciales de Supabase para Backend Python
├── DEAM_Annotations.zip              # Anotaciones estáticas originales DEAM (escala [1, 9], 1.802 registros)
├── metadata.zip                      # Metadatos originales DEAM + PMEmo (794 registros en [0, 1])
├── vercel.json                       # Configuración de despliegue automático para Vercel (frontend/dist)
├── requirements.txt                  # Dependencias del motor algorítmico y pruebas en Python
├── config/
│   ├── settings.py                   # Cargador nativo de /.env, constantes y parámetros globales
│   ├── schema_contract.json          # Contrato de datos JSON (1.284 pistas en [-1, 1]^2)
│   └── parameters.json               # Hiperparámetros calibrados (lambda=0.65, delta=0.65, beta=5.0)
├── data/
│   └── catalogo_sirem_1284.csv       # Catálogo limpio y normalizado (522 DEAM + 762 PMEmo = 1.284 pistas)
├── supabase/
│   └── migrations/
│       └── 20261105_sirem_schema.sql # Esquema PostgreSQL de las 4 tablas (catalog_tracks, musical_guides, benchmark_scenarios, usability_trials)
├── docs/
│   ├── SIREM_Sustentacion_14_diapositivas.pptx # Presentación oficial de sustentación final (14 diapositivas + notas de orador)
│   ├── diccionario_datos_v1.md       # Diccionario de variables y reglas de normalización lineal
│   ├── reporte_auditoria_ca1.md      # Embudo de depuración (2.596 -> 1.284) y distribución por cuadrante
│   ├── reporte_30_escenarios_ca2.csv # Resultados detallados de los 30 escenarios experimentales (CA2)
│   ├── reporte_30_escenarios_ca2.md  # Reporte comparativo de los 4 algoritmos sobre los 30 escenarios
│   ├── benchmark_100_corridas_ca3.csv# Medición de latencia en 100 corridas consecutivas (P95 <= 2,0 s; ref. 0,48 s)
│   ├── verificacion_20_fichas_ca4.csv# Matriz de auditoría de las 20 fichas sintéticas (CA4)
│   ├── fichas_sinteticas/            # 20 fichas sintéticas exportadas (SIREM-SYN-01.json a SIREM-SYN-20.json)
│   ├── protocolo_consentimiento_ca5.md # Protocolo de consentimiento informado y evaluación pareada (CA5)
│   └── resultados_usabilidad_ca5.csv # Registros empíricos pareados (EVAL-01 a EVAL-10) y contraste MGA
├── src/
│   ├── data_cleaning.py              # Pipeline reproducible de extracción, cruce y normalización (CA1)
│   ├── routing_engine.py             # Motor algorítmico (Dijkstra, Markov-Boltzmann, Vecino y Aleatoria)
│   ├── ficha_exporter.py             # Exportador institucional de Fichas Técnicas (JSON, CSV, HTML)
│   ├── supabase_sync.py              # Sincronizador administrativo por lotes (service_role) hacia Supabase REST
│   ├── app_streamlit.py              # Interfaz analítica complementaria en Python / Streamlit
│   └── engine/                       # Submódulos modulares del motor matemático
├── tests/
│   ├── test_ca1_catalog.py           # Verificación automatizada del criterio CA1
│   ├── test_ca2_ca3_benchmarks.py    # Verificación automatizada de los criterios CA2 y CA3 (P95 <= 2,0 s)
│   ├── test_ca4_synthetic_20.py      # Verificación automatizada del criterio CA4 (20 fichas)
│   ├── test_engine.py                # Pruebas unitarias de ecuaciones ISO y restricciones
│   ├── test_integration.py           # Pruebas de integración extremo a extremo
│   └── test_performance.py           # Pruebas de rendimiento P95 <= 2,0 s (<= 2000 ms)
└── frontend/                         # Aplicación web modular en React 19 + TypeScript + Tailwind CSS 4
    ├── .env.example                  # Plantilla de las 2 variables públicas VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── types/sirem.ts            # Tipos e interfaces del dominio afectivo-musical
        ├── data/catalog_1284.json    # Las 1.284 pistas auditadas reales embebidas para el frontend
        ├── data/seedData.ts          # 30 escenarios CA2, 20 casos sintéticos CA4 y ensayos CA5
        ├── services/mathEngine.ts    # Motor matemático en TypeScript alineado con src/routing_engine.py
        ├── lib/supabaseClient.ts     # Sincronización bidireccional por lotes (upsert) hacia Supabase + fallback local
        └── components/               # Layout institucional, plano de Russell interactivo y los 6 módulos
```

---

## Instrucciones de Ejecución y Verificación

### 1. Pipeline de Datos y Suite de Pruebas en Python (`CA1` a `CA4`)
Desde la raíz del repositorio:
```bash
# 1. Procesar archivos originales DEAM_Annotations.zip y metadata.zip -> 1.284 pistas
python src/data_cleaning.py

# 2. Ejecutar la suite completa de pruebas unitarias y de aceptación (CA1 a CA4)
python -m unittest discover -s tests -p "test_*.py" -v
```

### 2. Aplicación Web Modular en React + TypeScript (`frontend/`)
```bash
cd frontend
npm install
npx tsc --noEmit
npm run build
npm run dev
```

### 3. Configuración Segura de las 3 Credenciales y Persistencia en Supabase
1. Ejecute el script SQL `supabase/migrations/20261105_sirem_schema.sql` en el editor SQL de su proyecto en Supabase para crear las 4 tablas (`catalog_tracks`, `musical_guides`, `benchmark_scenarios`, `usability_trials`).
2. **En la raíz del proyecto (`/.env` — exclusivo para Backend Python):** configure las **3 credenciales** (copiando desde `.env.example`):
   ```env
   SUPABASE_URL="https://tu-proyecto.supabase.co"
   SUPABASE_ANON_KEY="tu-clave-publica-anon"
   SUPABASE_SERVICE_ROLE_KEY="tu-clave-privada-service-role-exclusiva-backend"
   ```
   Luego ejecute desde la terminal para sincronizar por lotes las 1.284 pistas, los 30 escenarios, las 20 fichas sintéticas y los ensayos pareados:
   ```bash
   python src/supabase_sync.py
   ```
3. **En el proyecto web (`frontend/.env` o variables de entorno en Vercel):** configure **únicamente las 2 claves públicas** (jamás incluya `service_role` en el frontend):
   ```env
   VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
   VITE_SUPABASE_ANON_KEY="tu-clave-publica-anon"
   ```
   También puede verificar la conexión y ejecutar la sincronización por lotes directamente desde el **Módulo 6 (Persistencia en Supabase)** de la interfaz web. Tanto `/.env` como `frontend/.env` están excluidos en `.gitignore` para proteger sus secretos.
