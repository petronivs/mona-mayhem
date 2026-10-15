<!-- l10n-sync: source-file="README.md" -->
🌐 [English](README.md) | Español | [Português (Brasil)](README.pt_BR.md) | [한국어](README.ko.md)

# 🎮 Mona Mayhem

**Taller de VS Code y GitHub Copilot CLI** — Construye una arena de batalla de contribuciones de GitHub

Una plantilla de taller para crear con Astro un sitio web de temática arcade retro que compara los gráficos de contribuciones de GitHub de dos usuarios. Este es el **punto de partida**: construirás la aplicación paso a paso con GitHub Copilot.

![Mona Mayhem Screenshot](https://github.com/user-attachments/assets/5eca79e2-cb9f-4e93-aa0d-23666ebde3b7)
*Lo que habrás construido al final del taller*

## 📚 Taller

El taller ofrece dos pistas; sigue la que mejor se ajuste a tu forma de trabajar:

- **Pista de VS Code**: Chat, Plan Mode, Agent Mode, agentes en segundo plano y ciclos de revisión integrados en el editor
- **Pista de CLI**: `copilot`, contexto con `@file`, `/plan`, ediciones autónomas, `/fleet`, `/delegate` y `/review`

| Parte | Título | Enfoque de Copilot |
|-------|--------|--------------------|
| [00](workshop/es/00-overview.md) | Visión General | Elección de pista y objetivos de aprendizaje |
| [01](workshop/es/01-setup.md) | Configuración e Ingeniería de Contexto | Instrucciones, permisos y configuración del entorno |
| [02](workshop/es/02-plan-and-scaffold.md) | Planificar y Estructurar | Planificación de la API y de la arquitectura de la página |
| [03](workshop/es/03-agent-mode.md) | Construir el Juego | Implementación agéntica e iteración |
| [04](workshop/es/04-design-vibes.md) | Temas Design-First | Planificación e implementación del diseño visual |
| [05](workshop/es/05-polish.md) | Pulido y Trabajo Paralelo | Paralelismo, revisiones y pasadas de calidad |
| [06](workshop/es/06-bonus.md) | Bonus y Extensiones | Ideas de funcionalidades abiertas y experimentos adicionales con Copilot |

## 🚀 Inicio Rápido

1. **Crea primero tu propio repositorio** de una de estas formas:
   - haciendo clic en **Use this template** para crear un repositorio nuevo, o
   - creando un fork de este repositorio.
2. Elige tu pista del taller:
   - **VS Code:** clona tu repositorio y ábrelo en VS Code.
   - **GitHub Copilot CLI:** clona tu repositorio en local, instala `copilot` y trabaja desde la terminal.
3. Sigue la [guía del taller](workshop/es/00-overview.md)

## Requisitos Previos

### Comunes

- GitHub Copilot (Pro, Business o Enterprise)
- Git
- Node.js

### Pista de VS Code

- VS Code v1.107+
- Extensión de GitHub Copilot con la sesión iniciada

### Pista de CLI

- GitHub Copilot CLI (`copilot`)
- Node.js 22+ si piensas instalar la CLI con `npm install -g @github/copilot`
- O Homebrew / WinGet si prefieres instalarla con un gestor de paquetes nativo

## Stack Tecnológico

- **Framework**: [Astro](https://astro.build/) v6
- **Runtime**: Node.js con el adaptador [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/)
- **Fuente**: Press Start 2P (fuente de videojuegos retro)
- **API**: API del gráfico de contribuciones de GitHub

## Desarrollo y validación

```bash
npm ci
npm run dev
```

El servidor de desarrollo se ejecuta en `http://localhost:4321`.

```bash
npm test
npm test -- src/lib/contributions.test.ts
npm test -- src/lib/contributions.test.ts -t "expires cached data"
npm run typecheck
npm run build
npm run preview
```

Las pruebas unitarias usan Vitest con solicitudes simuladas al servidor de origen y relojes deterministas.
`typecheck` genera los tipos de Astro y comprueba el código TypeScript; `build` crea
la aplicación Node independiente (standalone).

## API de contribuciones

`GET /api/contributions/:username` obtiene en el servidor los datos públicos de contribuciones de
`https://github.com/{username}.contribs` y normaliza el formato JSON v2 de GitHub. La interfaz de la página de batalla sigue siendo un punto de partida.

```bash
curl -i http://localhost:4321/api/contributions/octocat
curl -i http://localhost:4321/api/contributions/bad_name
```

Las respuestas correctas tienen esta forma (valores ilustrativos):

```json
{
  "username": "octocat",
  "totalContributions": 3,
  "from": "2026-10-14",
  "to": "2026-10-14",
  "days": [
    { "date": "2026-10-14", "count": 3, "level": 1 }
  ]
}
```

Las fechas son inclusivas y tienen el formato `YYYY-MM-DD`, derivado de UTC. Los días están ordenados
cronológicamente; los recuentos son enteros no negativos y los niveles van de 0 a 4.
Los nombres de usuario no distinguen mayúsculas de minúsculas y se devuelven en minúsculas. Deben contener
de 1 a 39 letras ASCII, dígitos o guiones, sin guiones al principio, al final ni consecutivos.

Los errores devuelven `{"error":"Human-readable message","code":"STABLE_ERROR_CODE"}`:

| Estado HTTP | Código | Significado |
| --- | --- | --- |
| 400 | `INVALID_USERNAME` | Nombre de usuario no válido |
| 404 | `USER_NOT_FOUND` | El usuario de GitHub no existe |
| 502 | `UPSTREAM_ERROR` | Fallo de red u otro estado o redirección inesperados del servidor de origen |
| 502 | `INVALID_UPSTREAM_DATA` | JSON no válido, esquema o contenido no admitidos, datos incoherentes o cuerpo demasiado grande |
| 503 | `UPSTREAM_UNAVAILABLE` | Limitación de peticiones de GitHub o fallo del servidor de origen |
| 503 | `SERVICE_BUSY` | Todas las ranuras de la caché local tienen solicitudes en curso |
| 504 | `UPSTREAM_TIMEOUT` | La solicitud a GitHub superó los diez segundos |
| 500 | `INTERNAL_ERROR` | Fallo interno inesperado |

Cada solicitud al servidor de origen tiene un plazo de diez segundos, que incluye la lectura del cuerpo, y
un límite de 1 MiB para el cuerpo. Las solicitudes no se reintentan y no se siguen las redirecciones.

Los resultados correctos validados se almacenan en caché durante cinco minutos una vez completada la obtención.
La caché local del proceso contiene como máximo 500 nombres de usuario, incluidas las solicitudes
en curso; las solicitudes simultáneas del mismo nombre de usuario comparten una única obtención.
Las entradas caducadas se eliminan antes de expulsar las entradas completadas menos usadas
recientemente (LRU). Los fallos no se almacenan en caché y nunca se sirven resultados obsoletos. La caché
se reinicia con el servidor y no se comparte entre instancias. Las respuestas HTTP
usan `Cache-Control: no-store` para que los navegadores y las CDN no añadan otra caché.

## Notas de despliegue

### Configuración actual de GitHub Pages

El flujo de trabajo de `.github/workflows/deploy.yml` despliega actualmente en GitHub Pages el contenido estático del taller y de la documentación de `docs/` y `workshop/`. No compila ni despliega la aplicación Astro de `src/`.

### Despliegue de la aplicación Astro

El proxy de contribuciones necesita un servidor en ejecución. Mantén la salida de servidor y el
adaptador Node standalone, compila con `npm run build` y ejecuta
`node dist/server/entry.mjs` en un host con Node. `HOST` y `PORT` controlan la
dirección de escucha.

GitHub Pages no puede alojar esta aplicación sin cambios. Un despliegue exclusivamente estático
exigiría antes eliminar la API de contribuciones o trasladarla a un backend independiente
y adaptar el cliente; cambiar solo la salida de Astro no es suficiente.

## Licencia

MIT
