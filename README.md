# 드론스팟맵 MVP v7

드론 촬영 스팟, 이륙 포인트, 주차, 추천 시간대, 주의사항, 브이월드 공공데이터 레이어, 비행 전 공식 확인 링크를 모아보는 Vite + React 기반 지도 MVP입니다.

## v7 변경점

- Google Search Console / 네이버 서치어드바이저 등록용 SEO 기본 구조 추가
- `index.html` 메타태그, OG/Twitter 태그, JSON-LD 구조화 데이터 추가
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `og-image.svg` 추가
- 스팟별 URL 라우팅 초안 추가
  - `/spots/paldang-toechon-river`
  - `/spots/yangpyeong-dumulmeori`
  - `/spots/sihwa-dae-budo`
  - `/spots/ganghwa-dongmak`
- 스팟 선택 시 브라우저 URL 변경
- 스팟별 `title`, `description`, `canonical`, OG 메타태그 동적 갱신
- Render 정적 배포용 `render.yaml` 추가

## 실행

```bash
npm install
npm run dev
```

## 환경변수

프로젝트 루트에 `.env` 파일을 만들고 아래처럼 입력합니다.

```env
VITE_VWORLD_KEY=발급받은_브이월드_API_KEY
VITE_VWORLD_DOMAIN=http://localhost:5173
```

배포 후에는 브이월드 운영 도메인에 맞게 키/도메인을 다시 등록하세요.

```env
VITE_VWORLD_DOMAIN=https://실제-render-도메인.onrender.com
```

## 빌드

```bash
npm run build
```

## Render 배포

1. GitHub에 이 프로젝트를 올립니다.
2. Render에서 새 Web Service 또는 Blueprint로 연결합니다.
3. 정적 사이트 기준 설정은 아래와 같습니다.

```text
Build Command: npm install && npm run build
Publish Directory: dist
```

`render.yaml`을 사용하면 정적 배포와 SPA fallback rewrite가 같이 잡힙니다.

## SEO 등록 전 꼭 수정할 것

현재 SEO 파일들은 기본 도메인을 아래 임시 주소로 잡아두었습니다.

```text
https://drone-spot-map.onrender.com
```

Render에서 실제 배포 주소가 다르면 아래 파일에서 도메인을 실제 주소로 바꾸세요.

- `index.html`
- `public/robots.txt`
- `public/sitemap.xml`
- `src/seo.ts`의 `DEFAULT_ORIGIN`

그 다음 Search Console과 네이버 서치어드바이저에 사이트를 등록하고, 아래 sitemap을 제출하면 됩니다.

```text
https://실제도메인/sitemap.xml
```

## 주의

이 앱의 공공데이터/스팟 정보는 참고용입니다. 실제 비행 가능 여부는 드론원스톱, DJI Fly Safe, 관제권, 군사시설, 촬영금지시설, 현장 안전 조건을 반드시 공식 확인해야 합니다.
