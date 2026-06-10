import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bookmark, Check, CloudSun, Copy, ExternalLink, Heart, MapPinned, MessageCircle, Navigation, Star, ThumbsDown, X } from 'lucide-react';
import { AirspaceZone, SavedStatus, Spot } from '../types';
import { averageRating, categoryLabel, cautionLabel, crowdLevelLabel, difficultyLabel, parkingLabel, takeoffSpaceLabel, zoneLabel } from '../utils';

interface SpotDetailProps {
  spot?: Spot;
  matchedZones: AirspaceZone[];
  savedStatuses: SavedStatus[];
  onToggleSavedStatus: (status: SavedStatus) => void;
  onClose: () => void;
  onReviewClick: () => void;
}

const checklistItems = [
  '드론원스톱에서 공역/비행 승인 필요 여부 확인',
  'DJI Fly Safe에서 기체 잠금/제한구역 확인',
  '관제권·군부대·촬영금지시설 방향 확인',
  '날씨, 풍속, 강수, 돌풍 가능성 확인',
  '사람 많은 곳·차량 동선·사유지 피하기',
  '이륙/착륙 공간과 비상 착륙 지점 확인',
  '배터리, SD카드, 프로펠러, 펌웨어 상태 확인',
];

const savedButtonMeta: Array<{ id: SavedStatus; label: string; icon: ReactNode }> = [
  { id: 'favorite', label: '즐겨찾기', icon: <Heart size={16}/> },
  { id: 'want', label: '가보고 싶음', icon: <Bookmark size={16}/> },
  { id: 'visited', label: '다녀옴', icon: <Check size={16}/> },
  { id: 'disliked', label: '비추', icon: <ThumbsDown size={16}/> },
];

export default function SpotDetail({ spot, matchedZones, savedStatuses, onToggleSavedStatus, onClose, onReviewClick }: SpotDetailProps) {
  const [copied, setCopied] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  if (!spot) {
    return <section className="detail empty"><MapPinned size={32}/><h2>스팟을 선택해봐</h2><p>지도 마커나 왼쪽 목록을 누르면 촬영 포인트 정보가 나와.</p></section>;
  }

  const avg = averageRating(spot.reviews.map((review) => review.rating));
  const coordinateText = `${spot.lat}, ${spot.lng}`;
  const encodedName = encodeURIComponent(spot.name);
  const naverMapUrl = `https://map.naver.com/p/search/${encodedName}`;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodedName}`;
  const windyUrl = `https://www.windy.com/${spot.lat}/${spot.lng}?${spot.lat},${spot.lng},11`;
  const weatherUrl = `https://www.google.com/search?q=${encodeURIComponent(`${spot.name} 날씨 풍속`)}`;
  const sunsetUrl = `https://www.google.com/search?q=${encodeURIComponent(`${spot.name} 일출 일몰 시간`)}`;

  async function copyCoordinates() {
    try {
      await navigator.clipboard.writeText(coordinateText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      alert(`좌표: ${coordinateText}`);
    }
  }

  function toggleChecklistItem(item: string) {
    setCheckedItems((prev)=>prev.includes(item) ? prev.filter((current)=>current!==item) : [...prev, item]);
  }

  return (
    <section className="detail">
      <button className="closeButton" onClick={onClose}><X size={18}/></button>
      {spot.imageUrl && <img className="heroImage" src={spot.imageUrl} alt={spot.name}/>} 
      <div className="detailBody">
        <div className="levelBadge">{cautionLabel[spot.cautionLevel]}</div>
        <h2>{spot.name}</h2>
        <p className="address">{spot.address}</p>
        <div className="scoreLine"><Star size={17}/>{avg ? avg.toFixed(1) : '후기 없음'}<span>후기 {spot.reviews.length}개</span></div>

        <div className="saveButtonRow">
          {savedButtonMeta.map((item)=>(
            <button key={item.id} className={savedStatuses.includes(item.id) ? 'saveButton active' : 'saveButton'} onClick={()=>onToggleSavedStatus(item.id)}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>

        <div className="officialCheckBox">
          <strong>비행 전 최종 확인</strong>
          <p>이 앱은 촬영 스팟과 현장 후기를 모아보는 참고 지도야. 실제 비행 가능 여부는 드론원스톱, DJI Fly Safe, 관제권·군·촬영금지시설 여부를 따로 확인해야 해.</p>
          <button className="checklistToggle" onClick={()=>setChecklistOpen((value)=>!value)}>{checklistOpen ? '체크리스트 접기' : '비행 전 체크리스트 열기'}</button>
          {checklistOpen && (
            <div className="checklist">
              {checklistItems.map((item)=>(
                <label key={item}>
                  <input type="checkbox" checked={checkedItems.includes(item)} onChange={()=>toggleChecklistItem(item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {matchedZones.length > 0 && (
          <div className="zoneWarningBox">
            <strong>이 스팟 주변 참고 레이어</strong>
            <p>샘플 레이어 기준으로 아래 구역과 겹칠 가능성이 있어. 실제 비행 전 공식 확인 필수.</p>
            <div className="zoneTags">
              {matchedZones.map((zone)=><span key={zone.id}>{zoneLabel[zone.type]} · {zone.name}</span>)}
            </div>
          </div>
        )}

        <div className="statGrid richStats">
          <div><span>카테고리</span><strong>{categoryLabel[spot.category]}</strong></div>
          <div><span>난이도</span><strong>{difficultyLabel[spot.difficulty]}</strong></div>
          <div><span>주차</span><strong>{parkingLabel[spot.parking]}</strong></div>
          <div><span>이륙 공간</span><strong>{takeoffSpaceLabel[spot.takeoffSpace]}</strong></div>
          <div><span>사람 많음</span><strong>{crowdLevelLabel[spot.crowdLevel]}</strong></div>
          <div><span>추천 시간</span><strong>{spot.bestTime.join(', ')}</strong></div>
        </div>

        <h3>현장 메모</h3><p className="bodyText">{spot.description}</p>
        <h3>이륙 포인트</h3><p className="bodyText">{spot.takeoffPoint}</p>

        {spot.viewPoints.length > 0 && <><h3>촬영 포인트</h3><div className="tagWrap pointTags">{spot.viewPoints.map((item)=><span key={item}>{item}</span>)}</div></>}
        {spot.cautions.length > 0 && <><h3>주의사항</h3><div className="cautionList">{spot.cautions.map((item)=><span key={item}>⚠ {item}</span>)}</div></>}

        <h3>날씨·풍속 확인</h3>
        <div className="actionRow compact">
          <a className="outlineButton" href={weatherUrl} target="_blank" rel="noreferrer"><CloudSun size={17}/>날씨/풍속</a>
          <a className="outlineButton" href={windyUrl} target="_blank" rel="noreferrer"><CloudSun size={17}/>Windy</a>
          <a className="outlineButton" href={sunsetUrl} target="_blank" rel="noreferrer"><CloudSun size={17}/>일출·일몰</a>
        </div>

        <h3>좌표</h3>
        <div className="coordinateBox">
          <code>{coordinateText}</code>
          <button className="textButton" onClick={copyCoordinates}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? '복사됨' : '좌표 복사'}</button>
        </div>
        <div className="tagWrap">{spot.tags.map((tag)=><span key={tag}>{tag}</span>)}</div>

        <div className="actionRow">
          <a className="outlineButton" href={spot.officialCheckUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/>드론원스톱</a>
          <a className="outlineButton" href="https://fly-safe.dji.com/" target="_blank" rel="noreferrer"><ExternalLink size={17}/>DJI Fly Safe</a>
          <a className="outlineButton" href={kakaoMapUrl} target="_blank" rel="noreferrer"><Navigation size={17}/>카카오맵</a>
          <a className="outlineButton" href={naverMapUrl} target="_blank" rel="noreferrer"><Navigation size={17}/>네이버지도</a>
        </div>

        <div className="reviewHeader"><h3>후기</h3><button className="textButton" onClick={onReviewClick}><MessageCircle size={16}/>후기 쓰기</button></div>
        <div className="reviews">
          {spot.reviews.length === 0 && <p className="emptyReview">아직 후기가 없어. 첫 후기를 남겨봐.</p>}
          {spot.reviews.map((review)=>(
            <article key={review.id} className="reviewCard">
              <div><strong>{review.nickname}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div>
              <p>{review.content}</p><small>{review.createdAt}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
