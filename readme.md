# SIREM (Sistema Inteligente de Regulación Emocional Musical)

Herramienta de apoyo a profesionales de psicología, orientación y bienestar para estructurar secuencias musicales personalizadas mediante criterios reproducibles de valencia y activación (V, A) y documentarlas en una ficha técnica trazable.

## Equipo de Trabajo (Grupo 9 & Grupo 1)
- **Andrés Santiago Marín Forero** – Dirección y Finanzas / Coordinación general
- **Anthoni Lexandre Hernández Díaz** – Arquitectura musical y algoritmos
- **Karol Yamile Palomino Prada** – Responsabilidad técnica y datos
- **Giselle Alejandra Vesga Romero** – Interfaz, ficha técnica y riesgos

## Arquitectura del Proyecto
El sistema se compone de:
1. **Catálogo y Contrato de Datos:** Auditoría, limpieza y normalización de datasets (**DEAM** y **PMEmo**) al espacio $[-1, 1]^2$.
2. **Motor de Secuenciación:** Grafo por etapas (Dijkstra) y modelo estocástico de transición (Cadenas de Markov) con control de restricciones y líneas base.
3. **Interfaz Web y Ficha Técnica:** Aplicación interactiva en **Streamlit** para parametrización, visualización del plano circumplejo de Russell, revisión de pistas y exportación de fichas técnicas versionadas.

## Requisitos de Instalación
Asegúrate de contar con Python 3.11 e instala las dependencias con:
```bash
pip install -r requirements.txt
