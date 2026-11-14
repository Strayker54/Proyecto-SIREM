# Diccionario de Datos del Catálogo Musical Auditado SIREM v1.0

**Proyecto:** Sistema Inteligente de Regulación Emocional Musical (SIREM) — Universidad Industrial de Santander (UIS)  
**Criterio de Aceptación:** CA1 (1.284 pistas auditadas y normalizadas en $[-1, 1]^2$)  
**Marco Normativo:** Ley 23 de 1982 (Derechos de Autor) y Ley 1581 de 2012 (Protección de Datos Personales)

| Campo | Tipo de Dato | Dominio / Rango | Descripción Técnica y Normativa |
| :--- | :--- | :--- | :--- |
| `track_id` | `string` (PK) | `DEAM-XXXX` / `PMEMO-XXXX` | Identificador único auditado y sin duplicados en el catálogo v1.0. |
| `title` | `string` | UTF-8 (1..120 caracteres) | Título de referencia de la obra musical sin almacenamiento de letra ni archivo de audio MP3/WAV. |
| `artist` | `string` | UTF-8 (1..80 caracteres) | Intérprete, compositor o agrupación registrada en los metadatos públicos de FMA / PMEmo. |
| `genre` | `string` | Categoría musical | Género o estilo instrumental de referencia asociado al cuadrante afectivo. |
| `source` | `enum` | `'DEAM' \| 'PMEmo'` | Dataset psicométrico publicado de origen (522 pistas DEAM + 762 pistas PMEmo = 1.284 pistas). |
| `v_raw` | `number` | DEAM `[1, 9]` · PMEmo `[0, 1]` | Anotación afectiva media original de Valencia en la escala nativa del corpus. |
| `a_raw` | `number` | DEAM `[1, 9]` · PMEmo `[0, 1]` | Anotación afectiva media original de Activación (*Arousal*) en la escala nativa del corpus. |
| `v_norm` | `number` | `[-1.0000, +1.0000]` | Coordenada de Valencia normalizada al Modelo Circumplejo de Russell mediante transformación lineal. |
| `a_norm` | `number` | `[-1.0000, +1.0000]` | Coordenada de Activación normalizada al Modelo Circumplejo de Russell mediante transformación lineal. |
| `quadrant` | `enum` | `'Q1' \| 'Q2' \| 'Q3' \| 'Q4'` | Cuadrante afectivo del plano de Russell derivado de los signos de `(v_norm, a_norm)`. |
| `duration_sec` | `integer` | `[60, 600]` segundos | Duración estimada de referencia de la pista en segundos. |
| `external_platform` | `string` | Plataforma externa | Nombre del repositorio o servicio externo de referencia (Free Music Archive, MediaEval DEAM, PMEmo Reference, YouTube Music, Spotify). |
| `external_url` | `uri (HTTPS)` | URL pública verificada | Enlace externo autorizado conforme a la Ley 23 de 1982; el sistema no aloja ni transmite archivos fonográficos. |
| `license_note` | `string` | Texto normativo | Nota de atribución académica y cumplimiento de derechos de autor. |
