🌐 [English](README.md) | [Español](README.es.md) | [Português (Brasil)](README.pt_BR.md) | 한국어

# 🎮 Mona Mayhem

**VS Code 및 GitHub Copilot CLI 워크숍** — GitHub 기여도 배틀 아레나 만들기

두 사용자의 GitHub 기여 그래프를 비교하는 레트로 아케이드 스타일 웹사이트를 Astro로 만드는 워크숍 템플릿입니다. 이 저장소는 **시작점**이며, GitHub Copilot을 사용해 단계별로 앱을 완성합니다.

![Mona Mayhem 스크린샷](https://github.com/user-attachments/assets/5eca79e2-cb9f-4e93-aa0d-23666ebde3b7)
*워크숍을 마치면 만들 수 있는 결과물*

## 📚 워크숍

워크숍은 두 가지 트랙을 제공합니다. 선호하는 작업 방식에 맞는 트랙을 선택하십시오.

- **VS Code 트랙** — 편집기 안에서 채팅(Chat), 계획 모드(Plan Mode), 에이전트 모드(Agent Mode), 백그라운드 에이전트(Background agents), 편집기 내 검토 흐름을 실습합니다.
- **CLI 트랙** — 터미널에서 `copilot`, `@file` 컨텍스트, `/plan`, 자율 편집, `/fleet`, `/delegate`, `/review`를 실습합니다.

| 파트 | 제목 | Copilot 중점 기능 |
|------|-------|------------------|
| [00](workshop/ko/00-overview.md) | 개요 | 트랙 선택 및 학습 목표 |
| [01](workshop/ko/01-setup.md) | 설정 및 컨텍스트 엔지니어링(Context Engineering) | 지침, 권한, 환경 설정 |
| [02](workshop/ko/02-plan-and-scaffold.md) | 계획 및 스캐폴딩(Scaffolding) | API 및 페이지 아키텍처 계획 |
| [03](workshop/ko/03-agent-mode.md) | 게임 구현 | 에이전트 기반 구현(Agentic implementation) 및 반복 개선 |
| [04](workshop/ko/04-design-vibes.md) | 디자인 우선 테마 구성 | 시각 디자인 계획 및 구현 |
| [05](workshop/ko/05-polish.md) | 다듬기 및 병렬 작업 | 병렬 처리, 검토, 품질 개선 |
| [06](workshop/ko/06-bonus.md) | 보너스 및 확장 기능 | 자유 과제 및 추가 실험 |

## 🚀 빠른 시작

1. 먼저 다음 방법 중 하나로 저장소를 만듭니다.
   - **Use this template**을 클릭해 새 저장소를 만들거나
   - 이 저장소를 포크합니다.
2. 원하는 워크숍 트랙을 선택합니다.
   - **VS Code:** 저장소를 복제하고 VS Code에서 엽니다.
   - **GitHub Copilot CLI:** 저장소를 로컬에 복제하고 `copilot`을 설치한 다음 터미널에서 작업합니다.
3. [워크숍 안내](workshop/ko/00-overview.md)를 따라 진행합니다.

## 사전 준비

### 공통

- GitHub Copilot(Pro, Business 또는 Enterprise)
- Git
- Node.js

### VS Code 트랙

- VS Code v1.107+
- GitHub Copilot 확장에 로그인

### CLI 트랙

- GitHub Copilot CLI(`copilot`)
- `npm install -g @github/copilot`으로 CLI를 설치하려면 Node.js 22+
- 또는 Homebrew나 WinGet 등 원하는 패키지 관리자로 설치

## 기술 스택

- **프레임워크:** [Astro](https://astro.build/) v6
- **런타임:** [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) 어댑터를 사용하는 Node.js
- **글꼴:** Press Start 2P(레트로 게임 글꼴)
- **API:** GitHub 기여 그래프 API

## 개발 및 검증

```bash
npm ci
npm run dev
```

개발 서버는 `http://localhost:4321`에서 실행됩니다.

```bash
npm test
npm test -- src/lib/contributions.test.ts
npm test -- src/lib/contributions.test.ts -t "expires cached data"
npm run typecheck
npm run build
npm run preview
```

단위 테스트는 Vitest와 모의(mock) 업스트림 요청, 결정적(deterministic) 시계를 사용합니다. `typecheck`는 Astro 타입을 생성하고 TypeScript 코드를 검사하며, `build`는 독립 실행형 Node 애플리케이션을 만듭니다.

## 기여도 API

`GET /api/contributions/:username`은 서버에서 `https://github.com/{username}.contribs`의 공개 기여도 데이터를 가져와 GitHub의 JSON v2 형식을 정규화합니다. 배틀 페이지 UI는 아직 시작 템플릿 상태입니다.

```bash
curl -i http://localhost:4321/api/contributions/octocat
curl -i http://localhost:4321/api/contributions/bad_name
```

성공 응답은 다음과 같은 형태입니다(예시 값).

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

날짜는 양 끝을 포함하며 UTC 기준으로 계산한 `YYYY-MM-DD` 값입니다. 일별 데이터는 시간순으로 정렬되고, 개수(count)는 0 이상의 정수이며, 레벨(level)은 0부터 4까지입니다. 사용자 이름은 대소문자를 구분하지 않으며 소문자로 반환됩니다. 사용자 이름은 ASCII 문자, 숫자 또는 하이픈 1~39자로 구성되어야 하고, 하이픈으로 시작하거나 끝나거나 연속될 수 없습니다.

오류는 `{"error":"Human-readable message","code":"STABLE_ERROR_CODE"}` 형식으로 반환됩니다.

| HTTP 상태 | 코드 | 의미 |
| --- | --- | --- |
| 400 | `INVALID_USERNAME` | 잘못된 사용자 이름 |
| 404 | `USER_NOT_FOUND` | GitHub 사용자가 존재하지 않음 |
| 502 | `UPSTREAM_ERROR` | 네트워크 오류 또는 그 밖의 예기치 않은 업스트림 상태/리디렉션 |
| 502 | `INVALID_UPSTREAM_DATA` | 잘못된 JSON, 지원되지 않는 스키마/콘텐츠, 일관되지 않은 데이터 또는 과도하게 큰 본문 |
| 503 | `UPSTREAM_UNAVAILABLE` | GitHub 요청 제한 또는 업스트림 서버 오류 |
| 503 | `SERVICE_BUSY` | 모든 로컬 캐시 슬롯에 진행 중인 요청이 있음 |
| 504 | `UPSTREAM_TIMEOUT` | GitHub 요청이 10초를 초과함 |
| 500 | `INTERNAL_ERROR` | 예기치 않은 내부 오류 |

각 업스트림 요청에는 본문 수신까지 포함해 10초의 제한 시간과 1 MiB의 본문 크기 제한이 적용됩니다. 요청은 재시도하지 않으며 리디렉션도 따라가지 않습니다.

검증된 성공 응답은 가져오기가 완료된 시점부터 5분간 캐시됩니다. 프로세스 로컬 캐시에는 진행 중인 요청을 포함해 최대 500개의 사용자 이름을 보관하며, 같은 사용자 이름에 대한 동시 요청은 하나의 가져오기를 공유합니다. 만료된 항목을 먼저 제거한 다음, 완료된 항목 중 가장 오래 사용되지 않은 항목부터 제거합니다. 실패는 캐시하지 않으며 오래된 결과는 절대 제공하지 않습니다. 캐시는 재시작하면 초기화되고 서버 인스턴스 간에 공유되지 않습니다. 브라우저나 CDN이 별도의 캐시를 추가하지 않도록 HTTP 응답에는 `Cache-Control: no-store`를 사용합니다.

## 배포 참고 사항

### 현재 GitHub Pages 구성

현재 `.github/workflows/deploy.yml` 워크플로는 `docs/` 및 `workshop/`의 정적 콘텐츠를 GitHub Pages에 배포합니다. `src/`의 Astro 앱을 빌드하거나 배포하지는 않습니다.

### Astro 애플리케이션 배포

기여도 프록시에는 런타임 서버가 필요합니다. 서버 출력과 독립 실행형 Node 어댑터를 유지하고, `npm run build`로 빌드한 다음 Node 호스트에서 `node dist/server/entry.mjs`를 실행합니다. `HOST`와 `PORT`로 수신 주소를 제어합니다.

GitHub Pages는 이 애플리케이션을 변경 없이 호스팅할 수 없습니다. 정적 전용 배포를 하려면 먼저 기여도 API를 제거하거나 별도의 백엔드로 옮기고 클라이언트를 맞게 수정해야 하며, Astro 출력 설정만 바꾸는 것으로는 충분하지 않습니다.

## 라이선스

MIT
