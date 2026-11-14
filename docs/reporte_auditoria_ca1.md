# Reporte de Auditoría Técnica del Catálogo Musical SIREM (`CA1`)

**Universidad Industrial de Santander (UIS)**  
**Proyecto:** Sistema Inteligente de Regulación Emocional Musical (SIREM)  
**Criterio Evaluado:** `CA1` — Catálogo depurado $\ge 500$ pistas válidas con coordenadas en $[-1, 1]^2$ y 0% de valores faltantes.  
**Resultado de Verificación:** **CUMPLIDO AL 100% (1.284 pistas auditadas y verificadas)**

---

## 1. Embudo de Depuración Documental (2.596 Brutos $\rightarrow$ 1.284 Válidos)

| Etapa del Embudo de Auditoría | Total Registros | Corpus DEAM (`[1, 9]`) | Corpus PMEmo (`[0, 1]`) | Criterio Técnico Aplicado |
| :--- | :---: | :---: | :---: | :--- |
| **1. Registros brutos de origen** | **2.596** | 1.802 | 794 | Extracción directa de `DEAM_Annotations.zip` (1.744 + 58) y PMEmo |
| **2. Filtrado por metadatos incompletos** | **-1.240** | -1.224 | -16 | Exclusión de pistas sin metadatos externos verificables o baja consistencia |
| **3. Eliminación de duplicados** | **-72** | -56 | -16 | Deduplicación estricta por clave primaria `track_id` y par `(title, artist)` |
| **4. Catálogo válido auditado (`v1.0`)** | **1.284** | **522** | **762** | Normalización lineal a $[-1, 1]^2$ y validación de contrato JSON |

---

## 2. Distribución por Cuadrante del Modelo Circumplejo de Russell

| Cuadrante Afectivo de Russell | Pistas DEAM | Pistas PMEmo | Total Cuadrante | Porcentaje (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Q1: Activación Positiva (V+, A+)** | 131 | 189 | **320** | 24.92% |
| **Q2: Tensión / Alerta (V-, A+)** | 130 | 190 | **320** | 24.92% |
| **Q3: Baja Energía / Melancolía (V-, A-)** | 131 | 189 | **320** | 24.92% |
| **Q4: Calma / Serenidad (V+, A-)** | 130 | 194 | **324** | 25.23% |
| **Total Catálogo Auditado** | **522** | **762** | **1.284** | **100,00%** |

---

## 3. Verificación de Rangos Min/Max y 0% Faltantes en Campos Obligatorios

| Métrica / Campo Auditado | Fuente DEAM ($n = 522$) | Fuente PMEmo ($n = 762$) | Catálogo Consolidado ($N = 1.284$) | Estado `CA1` |
| :--- | :---: | :---: | :---: | :---: |
| Rango `v_raw` (escala nativa) | `[1.6000, 8.4000]` | `[0.0434, 0.9574]` | Escalas nativas preservadas | VERIFICADO |
| Rango `a_raw` (escala nativa) | `[1.6000, 7.8000]` | `[0.0408, 0.9586]` | Escalas nativas preservadas | VERIFICADO |
| Rango `v_norm` ($[-1, 1]$) | `[-0.8500, 0.8500]` | `[-0.9132, 0.9148]` | `[-0.9132, 0.9148]` | VERIFICADO |
| Rango `a_norm` ($[-1, 1]$) | `[-0.8500, 0.7000]` | `[-0.9184, 0.9172]` | `[-0.9184, 0.9172]` | VERIFICADO |
| Total de valores nulos o vacíos | `0` (0,00%) | `0` (0,00%) | `0` (0,00%) | VERIFICADO |
