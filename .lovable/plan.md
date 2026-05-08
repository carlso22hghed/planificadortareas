
# Plan de implementación

Dado el volumen de cambios, se organizan en bloques prioritarios. Cada bloque se implementará secuencialmente.

---

## Bloque 1: Correcciones críticas de Progreso

**Problema:** Las rachas, productividad y gráficas no son fiables porque se basan en localStorage (se pierde entre dispositivos).

**Solución:**
- Refactorizar `use-productivity.ts` para calcular todo directamente desde las tareas en DB (campo `completed`, `due_date`, `created_at`) en lugar de localStorage
- Rachas: calcular días consecutivos con al menos 1 tarea completada usando `created_at` de tareas completadas
- Día más productivo: basado en conteo real de tareas completadas por día de la semana
- Pico productivo: basado en hora de `created_at` de tareas completadas
- Gráfica: datos reales de los últimos 14 días desde DB
- Eliminar dependencia de localStorage para datos de productividad

---

## Bloque 2: Pomodoro personalizable

- Añadir input numérico para personalizar minutos de trabajo, descanso y descanso largo
- Guardar tiempos personalizados en localStorage
- Mantener presets 25/5/15 como botones rápidos

---

## Bloque 3: Captura rápida en cada pestaña

- Mover `QuickCapture` del inicio a las pestañas de deberes, exámenes, eventos, partidos y tareas
- Adaptar el parser para reconocer tipos automáticamente según la pestaña activa

---

## Bloque 4: Mejoras de Nox AI - Organizar día

- Añadir diálogo previo al "Organizar mi día" con opciones:
  - Prioridad: exámenes primero / plazos más cercanos / importancia
  - Horario disponible (hora inicio y fin)
- Incluir datos del horario (`schedule` table) en el contexto de Nox para excluir horas ocupadas
- Pedir a Nox que asigne franjas horarias específicas a cada tarea

---

## Bloque 5: Estado "Bloqueada/En Pausa" para tareas

- Añadir campo `status` a la tabla `tasks` (pendiente, en_pausa, bloqueada)
- Mostrar badge visual en TaskItem
- Filtrar tareas bloqueadas del cálculo de productividad

---

## Bloque 6: Comentarios dentro de cada tarea

- Añadir sección de notas/comentarios en `TaskDetailDialog`
- Guardar en campo `comments` (jsonb array) en la tabla tasks

---

## Bloque 7: Exportación PDF semanal

- Botón "Exportar informe" en la pestaña Progreso
- Generar PDF con: tareas completadas, racha, gráfica, puntuación semanal
- Usar jsPDF en el frontend

---

## Bloque 8: Resumen semanal (cartel del lunes)

- Al detectar que es lunes y no se ha mostrado el resumen de la semana anterior, mostrar diálogo con estadísticas
- Guardar en localStorage la última semana mostrada

---

## Bloque 9: Modo Invitado / Demo

- Añadir botón "Probar sin cuenta" en Auth.tsx
- Cargar datos de ejemplo en memoria (sin DB)
- Mostrar banner "Modo demo - Regístrate para guardar"

---

## Bloque 10: Tutorial de Inicio (Onboarding)

- Al completar onboarding, mostrar tour guiado con 3-4 pasos
- Crear tarea de ejemplo precargada
- Marcar como completado en user_settings

---

## Bloque 11: Comandos de voz

- Botón de micrófono en QuickCapture usando Web Speech API
- Transcribir y pasar al parser de lenguaje natural

---

## Bloque 12: Atajos de teclado

- `N` = nueva tarea, `E` = nuevo examen, `D` = nuevo deber
- `/` = búsqueda (CommandPalette)
- Mostrar ayuda con `?`

---

## Bloque 13: Fecha límite real sugerida

- Al crear tarea compleja, sugerir fecha de inicio basada en historial
- Calcular promedio de tiempo por tipo de tarea similar

---

## Detalles técnicos

- **Migración DB necesaria:** Añadir `status` (text, default 'pendiente') y `comments` (jsonb, default '[]') a tabla tasks
- **Nuevos componentes:** `WeeklySummaryDialog`, `OrganizeDayDialog`, `OnboardingTour`, `KeyboardShortcutsHelp`
- **Dependencias nuevas:** jspdf (para exportación PDF)
- **Edge function:** Actualizar `nox-chat` para recibir contexto de horario y preferencias

