<!-- l10n-sync: source-file="workshop/03-agent-mode.md" -->
# Parte 3: Construir el Juego con Flujos de Trabajo Agénticos

---

En esta parte Copilot pasa de planificar a implementar. En lugar de escribir código línea por línea, describes lo que quieres y dejas que Copilot lleve a cabo el trabajo en todos los archivos que necesite modificar.

## Tarea 1: Conecta la Batalla

<!-- track:vscode:start -->
1. Cambia al modo **Agent** en Copilot Chat.
2. Escribe este prompt:
<!-- track:vscode:end -->

<!-- track:cli:start -->
1. Devuelve Copilot CLI a su flujo de codificación estándar (o permanece en autopilot si quieres que Copilot siga avanzando hasta que lo detengas).
2. Si te resulta útil, menciona el archivo de la página para dar más contexto: `@src/pages/index.astro`
3. Escribe este prompt:
<!-- track:cli:end -->

   > Add client-side JavaScript to the battle page that:
   > 1. When the Battle button is clicked, gets both usernames from the inputs
   > 2. Validates both are filled (show error if not)
   > 3. Fetches both users' contribution data in parallel from our API
   > 4. Renders contribution graphs as colored grids — each day is a colored square using GitHub's color palette
   > 5. Shows a VS badge between the two users
   > 6. Displays username, total contributions, and date range for each user
   > 7. Handles loading states and errors
   > 8. Also triggers on Enter key in input fields.
   > 9. Simple UI for now that is already scaffolded.
   >
   > Use TypeScript interfaces for the contribution data structure.

<!-- track:vscode:start -->
3. Deja que Agent Mode trabaje en la implementación a través de `index.astro`.
4. Revisa los cambios propuestos en la vista de diferencias antes de aceptarlos.
<!-- track:vscode:end -->

<!-- track:cli:start -->
4. Deja que Copilot CLI trabaje en la implementación a través de `src/pages/index.astro`.
5. Usa `/diff` para inspeccionar los cambios generados y, a continuación, apruébalos.
<!-- track:cli:end -->

## Tarea 2: Prueba la Batalla

> **⚠️ ¿No ves los cambios?** Si la página de batalla no se ha actualizado, detén el servidor de desarrollo (`Ctrl+C`), reinícialo con `npm run dev` y actualiza el navegador.

1. Escribe `octocat` y `torvalds` como los dos nombres de usuario y haz clic en **Battle**.
2. Deberías ver ambos gráficos de contribuciones lado a lado, como cuadrículas de colores.
3. Prueba los casos de error:
   - Deja uno o ambos campos vacíos y haz clic en Battle: deberías ver un error de validación.
   - Escribe un nombre de usuario no válido: la app debería mostrar un error de la API.
4. Prueba a pulsar **Enter** en cualquiera de los campos de entrada: debería iniciar la batalla igual que al hacer clic en el botón.

## Tarea 3: Itera con Copilot

Si algo no está del todo bien, da a Copilot indicaciones de seguimiento directamente. Por ejemplo:

- *"The contribution squares are too large, make them 12x12px"*
- *"Add a hover tooltip showing the date and contribution count"*
- *"The loading state needs a pulse animation"*

<!-- track:vscode:start -->
Agent Mode gestiona de forma natural los cambios en varios archivos y las iteraciones. Cada prompt de seguimiento se basa en la conversación anterior, de modo que puedes refinar la implementación de forma incremental sin empezar de cero.
<!-- track:vscode:end -->

<!-- track:cli:start -->
Las sesiones de Copilot CLI conservan su historial, por lo que cada prompt de seguimiento se basa en el anterior. Usa `/session` o `/context` si quieres inspeccionar lo que Copilot mantiene en contexto, y `/review` después de una iteración más grande si quieres una pasada adicional para detectar errores o pulir detalles.
<!-- track:cli:end -->

## Consejos para Esta Parte

- **Sé específico sobre lo que quieres**: unos requisitos claros producen mejores resultados.
- **Divide las tareas grandes en prompts más pequeños** si Copilot se desvía.
- **Revisa los cambios antes de aceptarlos**: es más rápido inspeccionar el código generado que reescribirlo después.
- **Prueba la aplicación inmediatamente después de cada pasada de implementación** para que los problemas queden acotados.

## ✅ Parte 3 Completa

Has aprendido a:

- Usar Copilot para **trabajo de implementación en varios archivos**
- **Iterar sobre los resultados** con prompts de seguimiento concretos
- Gestionar el **ciclo completo de una funcionalidad**: implementación, revisión, pruebas y refinamiento
