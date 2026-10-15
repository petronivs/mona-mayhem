<!-- l10n-sync: source-file="workshop/04-design-vibes.md" -->
# Parte 4: Tematización Orientada al Diseño

---

En esta parte usarás los ciclos de planificación e implementación de Copilot para diseñar una transformación completa del tema. Esto es desarrollo orientado al diseño: empieza con la visión, itera sobre lo visual y deja que Copilot se encargue del trabajo pesado de CSS.

## Tarea 1: Planifica el Tema Retro

<!-- track:vscode:start -->
Cambia al modo **Plan** en GitHub Copilot Chat.
<!-- track:vscode:end -->

<!-- track:cli:start -->
Usa `/plan` en GitHub Copilot CLI o pulsa **Shift+Tab** hasta que el modo plan esté activo.
<!-- track:cli:end -->

Escribe este prompt:

> I want to transform this page into a full retro arcade experience. Plan a comprehensive visual overhaul that includes: CRT scanline effects on the background, neon glow on the title that pulses like a neon sign, animated VS badge with gradient color shifts, shine/shimmer overlay on the user result cards, float-in animations for input fields, color-shifting loading text between green and purple, and hover glow effects on contribution squares. Keep the dark background (`#0a0a1a`) with green (`#5fed83`) and purple (`#8a2be2`) accent colors. Use a dark theme with the Press Start 2P retro gaming font from Google Fonts.

Copilot generará un plan de implementación detallado que cubrirá todos los efectos visuales. **No lo aceptes de inmediato**: revisa el plan e itera:

- Sugiere ajustes en el tiempo de las animaciones (por ejemplo, *"Make the neon pulse slower, around 3 seconds"*)
- Pregunta por efectos concretos (por ejemplo, *"How will the shimmer overlay work on the cards?"*)
- Pide cambios en el enfoque si algo no te convence

## Tarea 2: Implementa el Tema

Cuando estés satisfecho con el plan, pide a Copilot que lo implemente.

> Implement the retro arcade theme plan we just designed.

Copilot añadirá varias animaciones CSS, pseudoelementos y transiciones en tu hoja de estilos. Esto puede incluir:

- `@keyframes` para scanlines, pulso de neón, shimmer y efectos de aparición flotante
- Pseudoelementos (`::before`, `::after`) para efectos de superposición
- Propiedades personalizadas de CSS para los colores del tema
- Transiciones y estados hover para los elementos interactivos

<!-- track:cli:start -->
Cuando se apliquen los cambios, usa `/diff` para revisar los cambios de estilo antes de aprobarlos.
<!-- track:cli:end -->

## Tarea 3: Ajusta las Vibras

> **⚠️ ¿No ves los cambios?** Si el nuevo tema o las animaciones no aparecen, detén el servidor de desarrollo (`Ctrl+C`), reinícialo con `npm run dev` y fuerza la recarga (`Ctrl+Shift+R`) en el navegador.

Mantén abierta la vista previa del navegador e itera sobre el diseño. Prueba prompts como:

> The scanline effect is too strong, reduce opacity to 0.03

> Add a subtle electrical flicker to the title text

> The VS badge should pulse more dramatically

Esto es **desarrollo orientado al diseño**: iteras sobre el resultado visual en tiempo real. Cada prompt refina la experiencia hasta que te convence. No te conformes con "suficientemente bueno": sigue perfeccionando las vibras hasta que la página parezca sacada de una recreativa.

## Tarea 4: Actualiza las Instrucciones

Las instrucciones deben reflejar las decisiones de diseño importantes para que los prompts posteriores sigan alineados.

<!-- track:vscode:start -->
Pregunta a Copilot Chat:

> Add a design guide section to copilot-instructions.md describing our retro arcade theme: colors, fonts, animation style
<!-- track:vscode:end -->

<!-- track:cli:start -->
Pregunta a Copilot CLI:

> Update our repository instructions with a short design guide for the retro arcade theme: colors, fonts, animation style, and the rule that new UI should keep the neon aesthetic.
<!-- track:cli:end -->

Haz commit de las instrucciones actualizadas y de los cambios de diseño cuando la página tenga el aspecto deseado.

## ✅ Parte 4 Completa

**Lo que has aprendido:**

- Usar flujos de planificación para esbozar un **sistema de diseño antes de implementarlo**
- **Iterar sobre el resultado visual** con prompts de seguimiento rápidos
- **Actualizar las instrucciones tras las decisiones importantes** para que Copilot mantenga una identidad visual coherente
