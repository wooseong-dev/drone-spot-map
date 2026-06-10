import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { SavedStatus, Spot, SpotCategory } from '../types';
import { categoryLabel, cautionLabel, difficultyLabel, parkingLabel } from '../utils';
import type { QuickFilter } from '../App';

interface SidebarProps {
  spots: Spot[];
  selectedSpotId?: string;
  category: 'all' | SpotCategory;
  search: string;
  quickFilters: QuickFilter[];
  savedStatus: Record<string, SavedStatus[]>;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: 'all' | SpotCategory) => void;
  onQuickFilterToggle: (value: QuickFilter) => void;
  onSelectSpot: (spot: Spot) => void;
  onAddClick: () => void;
}

const categories: Array<'all' | SpotCategory> = ['all','river','sea','mountain','city','night','sunset'];
const quickFilterOptions: Array<{ id: QuickFilter; label: string }> = [
  { id: 'parking', label: '주차 가능' },
  { id: 'beginner', label: '초보 추천' },
  { id: 'sunset', label: '일몰 명소' },
  { id: 'night', label: '야경 가능' },
  { id: 'quiet', label: '사람 적음' },
  { id: 'wind', label: '바람 주의' },
  { id: 'approval', label: '승인 주의' },
];
const savedStatusLabel: Record<SavedStatus, string> = {
  favorite: '즐겨찾기', want: '가보고싶음', visited: '다녀옴', disliked: '비추',
};

export default function Sidebar({ spots, selectedSpotId, category, search, quickFilters, savedStatus, onSearchChange, onCategoryChange, onQuickFilterToggle, onSelectSpot, onAddClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">D</div>
        <div><h1>드론스팟맵</h1><p>날리기 전, 먼저 보는 촬영 지도</p></div>
      </div>
      <button className="primaryButton" onClick={onAddClick}><MapPin size={18}/>장소 제보하기</button>
      <div className="searchBox"><Search size={17}/><input value={search} onChange={(e)=>onSearchChange(e.target.value)} placeholder="장소, 태그, 설명 검색"/></div>
      <div className="filterTitle"><SlidersHorizontal size={16}/>카테고리</div>
      <div className="chips">
        {categories.map((item)=>(
          <button key={item} className={category===item?'chip active':'chip'} onClick={()=>onCategoryChange(item)}>
            {item==='all'?'전체':categoryLabel[item]}
          </button>
        ))}
      </div>
      <div className="filterTitle"><SlidersHorizontal size={16}/>드론 유저 필터</div>
      <div className="chips">
        {quickFilterOptions.map((item)=>(
          <button key={item.id} className={quickFilters.includes(item.id)?'chip active':'chip'} onClick={()=>onQuickFilterToggle(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <section className="seoIntro" aria-label="서비스 소개">
        <strong>드론 촬영 스팟 검색 지도</strong>
        <p>이륙 포인트, 주차, 일몰·야경 명소, 비행 전 공식 확인 링크를 한 번에 모아보는 드론 지도 서비스야.</p>
      </section>
      <div className="spotList">
        {spots.length === 0 && <div className="emptyList">조건에 맞는 스팟이 없어. 필터를 조금 풀어봐.</div>}
        {spots.map((spot)=>{
          const statuses = savedStatus[spot.id] ?? [];
          return (
            <button key={spot.id} className={selectedSpotId===spot.id?'spotRow selected':'spotRow'} onClick={()=>onSelectSpot(spot)}>
              <strong>{spot.name}</strong>
              <p>{spot.address}</p>
              <div className="miniTags"><span>{categoryLabel[spot.category]}</span><span>{cautionLabel[spot.cautionLevel]}</span><span>{parkingLabel[spot.parking]}</span><span>{difficultyLabel[spot.difficulty]}</span></div>
              {statuses.length > 0 && <div className="savedMiniTags">{statuses.map((status)=><span key={status}>{savedStatusLabel[status]}</span>)}</div>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
