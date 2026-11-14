# Reporte de Auditoría del Catálogo Musical SIREM (1.284 Pistas Válidas)

**Universidad Industrial de Santander (UIS)**  
**Escuela de Ingeniería de Sistemas e Informática**

## 1. Embudo de Depuración y Auditoría (Criterio CA1)

| Etapa del Embudo | Total de Registros | DEAM (Escala `[1, 9]`) | PMEmo (Escala `[0, 1]`) | Observación Técnica |
| :--- | :---: | :---: | :---: | :--- |
| **1. Registros brutos de origen** | 2.596 | 1.802 | 794 | Corpus psicométricos originales sin filtrar |
| **2. Exclusión por metadatos incompletos** | -1.240 | -1.224 | -16 | Registros sin título, intérprete o coordenadas $(V, A)$ completas |
| **3. Exclusión por duplicados** | -72 | -56 | -16 | Deduplicación estricta por identificador y combinación título-intérprete |
| **4. Catálogo válido auditado v1.0** | **1.284** | **522** | **762** | Pistas verificadas y normalizadas al espacio $[-1, 1]^2$ |

## 2. Ecuación de Normalización Lineal

Toda coordenada nativa $x \in [a, b]$ se transforma al intervalo bipolar $[-1, 1]$ mediante:

$$x_{\text{norm}} = 2 \cdot \left(\frac{x - a}{b - a}\right) - 1$$

- **DEAM:** $a = 1.0$, $b = 9.0$ (Aljanaki et al., 2017).
- **PMEmo:** $a = 0.0$, $b = 1.0$ (Zhang et al., 2018).
