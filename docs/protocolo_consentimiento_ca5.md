# Protocolo de Consentimiento Informado y Evaluación de Usabilidad Pareada (`CA5`)

**Universidad Industrial de Santander (UIS)**  
**Escuela de Ingeniería de Sistemas e Informática**  
**Proyecto:** Sistema Inteligente de Regulación Emocional Musical (SIREM)  
**Marco Normativo:** Ley 1581 de 2012 (Protección de Datos Personales en Colombia) y Ley 23 de 1982 (Derechos de Autor).

---

## 1. Declaración Ética y Alcance No Clínico (Mitigación de Riesgo `R5`)

1. **Propósito Académico y de Apoyo Técnico:** El sistema **SIREM** es un prototipo de software académico diseñado para apoyar la estructuración y documentación de secuencias musicales de acompañamiento en psicología, orientación y bienestar universitario. **No constituye un dispositivo médico, diagnóstico clínico ni reemplaza el criterio del profesional.**
2. **Prohibición de Datos Clínicos Sensibles (Ley 1581 de 2012):** En ninguna etapa de la prueba de usabilidad ni del uso del sistema se recolectan historias clínicas, nombres de pacientes reales ni datos biométricos o sensibles. Todos los registros emplean identificadores seudonimizados (`EVAL-01` a `EVAL-10`) y casos sintéticos (`SIREM-SYN-01` a `SIREM-SYN-20`).
3. **Verificación Obligatoria Previa al Cronometraje:** En el Módulo 5 de la aplicación (`UsabilityModule.tsx`), los controles del cronómetro pareado permanecen **bloqueados por diseño** hasta que el profesional participante marca explícitamente la casilla de Consentimiento Informado.

---

## 2. Diseño del Protocolo de Tareas Equivalentes Pareadas (`CA5`)

Cada participante ($n = 6$ a $10$ evaluadores con perfil en psicología, orientación o práctica supervisada) ejecuta dos tareas equivalentes de diseño de una guía musical de $m = 6$ etapas para una transición afectiva dada $(V_0, A_0) \rightarrow (V_f, A_f)$:

1. **Condición A — Estructuración Manual Tradicional ($T_{\text{manual}}$):**
   - Selección manual de 6 obras musicales coherentes con una transición gradual, verificación de metadatos (título, intérprete, duración, enlace externo) y redacción manual de la ficha documental.
   - **Referencia de línea base:** $T_{\text{manual}} \approx 35,0\text{ minutos por guía}$.
2. **Condición B — Estructuración Asistida con SIREM ($T_{\text{asistido}}$):**
   - Parametrización de $(V_0, A_0) \rightarrow (V_f, A_f)$ en el Módulo 1, generación automática con el algoritmo de Dijkstra por etapas, revisión/sustitución opcional de 1 pista en el mismo cuadrante de Russell y exportación de la Ficha Técnica institucional en el Módulo 2.
   - **Meta de aceptación (`CA5`):** $T_{\text{asistido}} \le 5,0\text{ minutos por guía}$ (ahorro objetivo $\Delta T \approx 30,0\text{ min/guía}$).

---

## 3. Contraste con el Punto de Equilibrio Económico MGA (Guías 3 y 7)

Conforme a la evaluación económica en la Metodología General Ajustada (MGA, horizonte de 3 años, tasa de descuento social $i = 9\%\text{ EA}$, volumen de 200 guías/año y valor hora profesional de \$45.000 COP):

| Escenario Presupuestal MGA | Costo de Inversión Inicial (Año 0) | Operación Anual (Años 1–3) | Umbral Mínimo de Equilibrio ($\text{VPN} \ge 0$) | Ahorro Medio Observado (`CA5`) | Dictamen Financiero |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Línea Base Original (Guía 3 / Guía 5)** | \$7.375.000 COP | \$480.000 COP/año | **19,20 min / guía** | **30,85 min / guía** | **VIABLE ($\text{VPN} > 0$)** |
| **Línea Base Actualizada (`SC-01` aprobada)** | \$7.465.000 COP | \$480.000 COP/año | **19,29 min / guía** | **30,85 min / guía** | **VIABLE ($\text{VPN} > 0$)** |
