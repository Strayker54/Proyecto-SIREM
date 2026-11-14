# Diccionario de Datos del Catálogo Musical Auditado SIREM v1.0 (`CA1`)

**Universidad Industrial de Santander (UIS)**  
**Escuela de Ingeniería de Sistemas e Informática**  
**Versión congelada del catálogo:** `v1.0-1284tracks` (522 pistas DEAM + 762 pistas PMEmo = 1.284 pistas válidas)  
**Marco Legal:** Cumplimiento de la Ley 23 de 1982 (Derechos de Autor, sin alojamiento de archivos de audio/letras) y Ley 1581 de 2012 (Protección de Datos Personales).

---

## 1. Estructura de Campos del Contrato de Datos (`schema_contract.json`)

| Campo | Tipo de Dato | Rango / Dominio Observado | Nulos (%) | Descripción Técnica y Normativa |
| :--- | :--- | :--- | :---: | :--- |
| `track_id` | `string` (PK) | `DEAM-0002` .. `PMEMO-0762` | 0 (0,0%) | Identificador primario único y auditado sin duplicados en el catálogo v1.0. |
| `title` | `string` | Texto UTF-8 no vacío | 0 (0,0%) | Título oficial de la pista extraído de `metadata.zip` (DEAM) y PMEmo. |
| `artist` | `string` | Texto UTF-8 no vacío | 0 (0,0%) | Intérprete, compositor o agrupación musical registrada en el corpus de origen. |
| `genre` | `string` | Categoría musical | 0 (0,0%) | Género o estilo instrumental de referencia asociado a la obra. |
| `source` | `enum` | `'DEAM'` (522) \| `'PMEmo'` (762) | 0 (0,0%) | Corpus psicométrico publicado de procedencia. |
| `v_raw` | `float` | DEAM: `[1.6000, 8.4000]` · PMEmo: `[0.0434, 0.9574]` | 0 (0,0%) | Calificación media original de Valencia en la escala nativa del dataset (`[1, 9]` o `[0, 1]`). |
| `a_raw` | `float` | DEAM: `[1.6000, 7.8000]` · PMEmo: `[0.0408, 0.9586]` | 0 (0,0%) | Calificación media original de Activación (*Arousal*) en la escala nativa del dataset. |
| `v_norm` | `float` | `[-0.913200, 0.914800]` $\subseteq [-1, 1]$ | 0 (0,0%) | Coordenada de Valencia normalizada linealmente al Plano Circumplejo de Russell. |
| `a_norm` | `float` | `[-0.918400, 0.917200]` $\subseteq [-1, 1]$ | 0 (0,0%) | Coordenada de Activación normalizada linealmente al Plano Circumplejo de Russell. |
| `quadrant` | `string` | `Q1`..`Q4` (Modelo de Russell) | 0 (0,0%) | Cuadrante emocional bidimensional asignado según el signo de $(v_{\text{norm}}, a_{\text{norm}})$. |
| `duration_sec` | `integer` | `[45, 450]` segundos | 0 (0,0%) | Duración de referencia de la pista en segundos. |
| `external_platform` | `string` | `Free Music Archive`, `MediaEval DEAM`, `PMEmo Reference`, `Spotify`, `YouTube Music` | 0 (0,0%) | Plataforma externa de consulta autorizada. |
| `external_url` | `uri (HTTPS)` | URL pública verificada | 0 (0,0%) | Enlace externo de referencia; SIREM no almacena ni distribuye fonogramas. |
| `license_note` | `string` | Texto normativo | 0 (0,0%) | Declaración explícita de atribución académica y respeto por derechos conexos (Ley 23 de 1982). |

---

## 2. Ecuación de Homologación Lineal al Espacio $[-1, 1]^2$

Cada valor afectivo bruto $v \in [a, b]$ se transforma al intervalo cerrado $[-1, 1]$ mediante la ecuación afín:

$$v_{\text{norm}} = 2\frac{v - a}{b - a} - 1$$

- **Para DEAM (Aljanaki et al., 2017):** $a = 1,0$, $b = 9,0$.
- **Para PMEmo (Zhang et al., 2018):** $a = 0,0$, $b = 1,0$.
