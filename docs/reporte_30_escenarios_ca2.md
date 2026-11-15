# Reporte Experimental de 30 Escenarios (`CA2`) y Benchmark de Latencia (`CA3`)

**Universidad Industrial de Santander (UIS)**  
**Proyecto:** Sistema Inteligente de Regulación Emocional Musical (SIREM)  
**Criterios Evaluados:** `CA2` (Comparación en 30 escenarios con $m \in [4, 8]$) y `CA3` (Percentil 95 de tiempo de respuesta $\text{P95} \le 2{,}0\text{ s}$ [$\le 2000\text{ ms}$] en 100 ejecuciones locales, con referencia de corte de control $\text{P95} = 0{,}48\text{ s}$ [$480\text{ ms}$]).  

---

## 1. Resumen Comparativo Agregado en los 30 Escenarios (`CA2`)

| Método Algorítmico | % Factibilidad | Costo Medio $J(P)$ | Salto Máximo Medio $d_{\max}(P)$ | Error Final Medio $e_{\text{obj}}(P)$ | Latencia $\text{P95}$ (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Dijkstra por Etapas (Principal)** | **100.0%** (30/30) | **1.3198** | **0.3303** | **0.2414** | 66.42 ms |
| **2. Cadena de Markov (Boltzmann)** | 100.0% (30/30) | 1.6908 | 0.3913 | 0.1890 | 43.72 ms |
| **3. Vecino Más Cercano (Línea Base)** | 16.7% | 2.6125 | 0.1598 | 1.1362 | 12.95 ms |
| **4. Aleatoria Admisible (Línea Base)** | 100.0% | 3.5784 | 0.6069 | 0.2758 | 22.90 ms |

---

## 2. Resultado del Benchmark de 100 Corridas Locales (`CA3`)

- **Corridas ejecutadas:** 100 consultas completas sobre el catálogo de 1.284 pistas.
- **Mediana observada ($\text{P50}$):** `94.05 ms` (`0.0941 s`).
- **Percentil 95 observado en motor algorítmico ($\text{P95}$):** `139.03 ms` (`0.1390 s`).
- **Valor medido en el corte de control (con renderizado UI):** `$\text{P95} = 0{,}48\text{ s}$` (`480 ms`).
- **Umbral máximo de aceptación (`CA3`):** $\text{P95} \le 2{,}0\text{ s}$ (`2000 ms`).
- **Dictamen `CA3`:** **CUMPLIDO** ($\text{P95} = 0.1390\text{ s} \le 0{,}48\text{ s (corte de control)} \le 2{,}0\text{ s}$).

---

## 3. Detalle de los 30 Escenarios Experimentales (`CA2`)

| Código | Escenario | Transición | $m$ | $(V_0, A_0)$ | $(V_f, A_f)$ | $J(P)$ Dijkstra | $d_{\max}$ Dijkstra | $e_{\text{obj}}$ Dijkstra | $J(P)$ Markov | Factible |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ESC-01` | Tensión a Calma (m=4) | C-II -> C-IV | 4 | `(-0.71, 0.74)` | `(0.66, -0.61)` | **1.7160** | 0.6364 | 0.3379 | 1.8243 | SÍ |
| `ESC-02` | Tensión a Calma (m=5) | C-II -> C-IV | 5 | `(-0.68, 0.71)` | `(0.63, -0.58)` | **1.6592** | 0.4842 | 0.3470 | 1.9781 | SÍ |
| `ESC-03` | Tensión a Calma (m=6) | C-II -> C-IV | 6 | `(-0.65, 0.68)` | `(0.60, -0.55)` | **1.5755** | 0.3536 | 0.3424 | 1.9486 | SÍ |
| `ESC-04` | Tensión a Calma (m=7) | C-II -> C-IV | 7 | `(-0.62, 0.65)` | `(0.57, -0.52)` | **1.5631** | 0.2919 | 0.3000 | 2.0382 | SÍ |
| `ESC-05` | Tensión a Calma (m=8) | C-II -> C-IV | 8 | `(-0.59, 0.62)` | `(0.54, -0.49)` | **1.5018** | 0.2605 | 0.2576 | 1.9745 | SÍ |
| `ESC-06` | Melancolía a Alegría (m=4) | C-III -> C-I | 4 | `(-0.74, -0.54)` | `(0.64, 0.42)` | **1.5413** | 0.5408 | 0.2550 | 1.6709 | SÍ |
| `ESC-07` | Melancolía a Alegría (m=5) | C-III -> C-I | 5 | `(-0.71, -0.57)` | `(0.61, 0.45)` | **1.5334** | 0.4100 | 0.2395 | 1.8209 | SÍ |
| `ESC-08` | Melancolía a Alegría (m=6) | C-III -> C-I | 6 | `(-0.68, -0.60)` | `(0.58, 0.48)` | **1.5817** | 0.3490 | 0.2525 | 1.8944 | SÍ |
| `ESC-09` | Melancolía a Alegría (m=7) | C-III -> C-I | 7 | `(-0.65, -0.63)` | `(0.55, 0.51)` | **1.5864** | 0.3008 | 0.2493 | 1.9585 | SÍ |
| `ESC-10` | Melancolía a Alegría (m=8) | C-III -> C-I | 8 | `(-0.62, -0.66)` | `(0.52, 0.54)` | **1.6071** | 0.2828 | 0.1969 | 2.0159 | SÍ |
| `ESC-11` | Melancolía a Serenidad (m=4) | C-III -> C-IV | 4 | `(-0.71, -0.39)` | `(0.64, -0.54)` | **1.2344** | 0.4275 | 0.3418 | 1.3195 | SÍ |
| `ESC-12` | Melancolía a Serenidad (m=5) | C-III -> C-IV | 5 | `(-0.68, -0.42)` | `(0.61, -0.51)` | **1.1957** | 0.3010 | 0.2697 | 1.4831 | SÍ |
| `ESC-13` | Melancolía a Serenidad (m=6) | C-III -> C-IV | 6 | `(-0.65, -0.45)` | `(0.58, -0.48)` | **1.1424** | 0.2750 | 0.2162 | 1.4856 | SÍ |
| `ESC-14` | Melancolía a Serenidad (m=7) | C-III -> C-IV | 7 | `(-0.62, -0.48)` | `(0.55, -0.45)` | **1.1217** | 0.2512 | 0.1865 | 1.6590 | SÍ |
| `ESC-15` | Melancolía a Serenidad (m=8) | C-III -> C-IV | 8 | `(-0.59, -0.51)` | `(0.52, -0.42)` | **1.0748** | 0.1768 | 0.1626 | 1.7738 | SÍ |
| `ESC-16` | Tensión a Enfoque (m=4) | C-II -> C-I | 4 | `(-0.66, 0.68)` | `(0.66, 0.32)` | **1.2056** | 0.4129 | 0.2720 | 1.4121 | SÍ |
| `ESC-17` | Tensión a Enfoque (m=5) | C-II -> C-I | 5 | `(-0.63, 0.65)` | `(0.63, 0.35)` | **1.1691** | 0.3076 | 0.2599 | 1.4311 | SÍ |
| `ESC-18` | Tensión a Enfoque (m=6) | C-II -> C-I | 6 | `(-0.60, 0.62)` | `(0.60, 0.38)` | **1.1292** | 0.2914 | 0.2295 | 1.5675 | SÍ |
| `ESC-19` | Tensión a Enfoque (m=7) | C-II -> C-I | 7 | `(-0.57, 0.59)` | `(0.57, 0.41)` | **1.1391** | 0.2084 | 0.2236 | 1.7117 | SÍ |
| `ESC-20` | Tensión a Enfoque (m=8) | C-II -> C-I | 8 | `(-0.54, 0.56)` | `(0.54, 0.44)` | **1.1154** | 0.1904 | 0.1903 | 1.7568 | SÍ |
| `ESC-21` | Euforia a Serenidad (m=4) | C-I -> C-IV | 4 | `(0.52, 0.74)` | `(0.64, -0.64)` | **1.2305** | 0.5106 | 0.3052 | 1.4972 | SÍ |
| `ESC-22` | Euforia a Serenidad (m=5) | C-I -> C-IV | 5 | `(0.55, 0.71)` | `(0.61, -0.61)` | **1.1598** | 0.3331 | 0.2376 | 1.3757 | SÍ |
| `ESC-23` | Euforia a Serenidad (m=6) | C-I -> C-IV | 6 | `(0.58, 0.68)` | `(0.58, -0.58)` | **1.1870** | 0.2482 | 0.2051 | 1.6900 | SÍ |
| `ESC-24` | Euforia a Serenidad (m=7) | C-I -> C-IV | 7 | `(0.61, 0.65)` | `(0.55, -0.55)` | **1.2348** | 0.2686 | 0.1402 | 1.7575 | SÍ |
| `ESC-25` | Euforia a Serenidad (m=8) | C-I -> C-IV | 8 | `(0.64, 0.62)` | `(0.52, -0.52)` | **1.1929** | 0.2194 | 0.1233 | 1.9737 | SÍ |
| `ESC-26` | Alerta leve a Reposo (m=4) | Centro -> C-IV | 4 | `(-0.21, 0.51)` | `(0.70, -0.68)` | **1.3437** | 0.4704 | 0.3340 | 1.4638 | SÍ |
| `ESC-27` | Alerta leve a Reposo (m=5) | Centro -> C-IV | 5 | `(-0.18, 0.48)` | `(0.67, -0.65)` | **1.2725** | 0.3579 | 0.2915 | 1.4829 | SÍ |
| `ESC-28` | Alerta leve a Reposo (m=6) | Centro -> C-IV | 6 | `(-0.15, 0.45)` | `(0.64, -0.62)` | **1.2263** | 0.3010 | 0.2000 | 1.4528 | SÍ |
| `ESC-29` | Alerta leve a Reposo (m=7) | Centro -> C-IV | 7 | `(-0.12, 0.42)` | `(0.61, -0.59)` | **1.1841** | 0.2500 | 0.1581 | 1.5968 | SÍ |
| `ESC-30` | Alerta leve a Reposo (m=8) | Centro -> C-IV | 8 | `(-0.09, 0.39)` | `(0.58, -0.56)` | **1.1694** | 0.1981 | 0.1166 | 1.7087 | SÍ |
