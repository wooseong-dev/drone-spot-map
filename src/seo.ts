import { Spot } from './types';

const SITE_NAME = '드론스팟맵';
const DEFAULT_ORIGIN = 'https://www.dronespotmap.kr';

function getOrigin() {
  if (typeof window === 'undefined') return DEFAULT_ORIGIN;
  return window.location.origin || DEFAULT_ORIGIN;
}

function ensureMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    const firstAttr = Object.entries(attrs)[0];
    if (firstAttr) element.setAttribute(firstAttr[0], firstAttr[1]);
    document.head.appendChild(element);
  }
  return element;
}

function setMetaName(name: string, content: string) {
  const element = ensureMeta(`meta[name="${name}"]`, { name });
  element.setAttribute('content', content);
}

function setMetaProperty(property: string, content: string) {
  const element = ensureMeta(`meta[property="${property}"]`, { property });
  element.setAttribute('content', content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function spotPath(spot: Spot) {
  return `/spots/${spot.id}`;
}

export function updateSeo(spot?: Spot) {
  const origin = getOrigin();
  const url = spot ? `${origin}${spotPath(spot)}` : `${origin}/`;
  const title = spot
    ? `${spot.name} 드론 촬영 스팟 | ${SITE_NAME}`
    : `${SITE_NAME} | 드론 촬영 스팟·비행 전 확인 지도`;
  const description = spot
    ? `${spot.name}의 드론 촬영 포인트, 이륙 위치, 주차, 추천 시간대, 주의사항과 드론원스톱·DJI Fly Safe 확인 링크를 지도에서 확인하세요.`
    : '드론 촬영 스팟, 이륙 포인트, 주차, 일몰·야경 명소, 비행 전 공역 확인 링크를 한 번에 보는 위치 기반 드론 지도 서비스입니다.';
  const keywords = spot
    ? `${spot.name}, ${spot.address}, 드론 촬영 스팟, 드론 촬영 장소, 드론 비행 가능 지역, 드론원스톱, DJI Fly Safe`
    : '드론스팟맵, 드론 촬영 장소, 드론 촬영 스팟, 드론 비행 가능 지역, 드론 비행 제한구역 지도, 드론원스톱, DJI Fly Safe, 서울 근교 드론';

  document.title = title;
  setMetaName('description', description);
  setMetaName('keywords', keywords);
  setMetaName('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  setCanonical(url);

  setMetaProperty('og:title', title);
  setMetaProperty('og:description', description);
  setMetaProperty('og:url', url);
  setMetaProperty('og:type', spot ? 'article' : 'website');
  setMetaProperty('og:site_name', SITE_NAME);

  setMetaName('twitter:title', title);
  setMetaName('twitter:description', description);
}

export function getSpotIdFromPath(pathname: string) {
  const match = pathname.match(/^\/spots\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
