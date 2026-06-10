import { FormEvent, useEffect, useState } from 'react';
import { CautionLevel, CrowdLevel, Difficulty, Parking, Spot, SpotCategory, TakeoffSpace } from '../types';
import { generateId } from '../utils';

interface AddSpotModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (spot: Spot) => void;
  initialCoords?: { lat: number; lng: number };
}

function splitList(value: string) {
  return value.split(',').map((item)=>item.trim()).filter(Boolean);
}

export default function AddSpotModal({ open, onClose, onAdd, initialCoords }: AddSpotModalProps) {
  const [name,setName]=useState(''); const [address,setAddress]=useState('');
  const [lat,setLat]=useState(''); const [lng,setLng]=useState('');
  const [category,setCategory]=useState<SpotCategory>('river');
  const [difficulty,setDifficulty]=useState<Difficulty>('normal');
  const [cautionLevel,setCautionLevel]=useState<CautionLevel>('unknown');
  const [parking,setParking]=useState<Parking>('unknown');
  const [takeoffSpace,setTakeoffSpace]=useState<TakeoffSpace>('unknown');
  const [crowdLevel,setCrowdLevel]=useState<CrowdLevel>('unknown');
  const [bestTime,setBestTime]=useState('');
  const [viewPoints,setViewPoints]=useState('');
  const [cautions,setCautions]=useState('');
  const [description,setDescription]=useState(''); const [takeoffPoint,setTakeoffPoint]=useState(''); const [tags,setTags]=useState('');

  useEffect(() => {
    if (!open || !initialCoords) return;
    setLat(String(initialCoords.lat));
    setLng(String(initialCoords.lng));
  }, [open, initialCoords]);

  if (!open) return null;

  function resetForm() {
    setName(''); setAddress(''); setLat(''); setLng(''); setDescription(''); setTakeoffPoint(''); setTags(''); setCategory('river');
    setDifficulty('normal'); setCautionLevel('unknown'); setParking('unknown'); setTakeoffSpace('unknown'); setCrowdLevel('unknown');
    setBestTime(''); setViewPoints(''); setCautions('');
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsedLat=Number(lat), parsedLng=Number(lng);
    if (!name || !address || Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) { alert('장소명, 주소, 위도, 경도는 필수야.'); return; }
    const spot: Spot = {
      id: generateId('spot'), name, address, lat: parsedLat, lng: parsedLng, category,
      difficulty, cautionLevel, parking, takeoffSpace, crowdLevel,
      bestTime: splitList(bestTime).length ? splitList(bestTime) : ['정보 필요'],
      viewPoints: splitList(viewPoints),
      cautions: splitList(cautions).length ? splitList(cautions) : ['공식 확인 필요'],
      tags: splitList(tags),
      description: description || '제보된 장소입니다. 상세 정보가 필요합니다.',
      takeoffPoint: takeoffPoint || '이륙 포인트 정보가 필요합니다.',
      officialCheckUrl:'https://drone.onestop.go.kr/', reviews:[]
    };
    onAdd(spot);
    resetForm();
    onClose();
  }

  function close() {
    resetForm();
    onClose();
  }

  return (
    <div className="modalBackdrop">
      <form className="modal" onSubmit={submit}>
        <h2>장소 제보하기</h2>
        <p>지도에서 우클릭하면 좌표가 자동 입력돼. 주차·사람·바람·이륙 공간까지 적어두면 진짜 실사용 DB가 돼.</p>
        <label>장소명<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="예: 팔당호 강변 포인트"/></label>
        <label>주소/위치 설명<input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="예: 경기 광주시 퇴촌면..."/></label>
        <div className="twoCols"><label>위도<input value={lat} onChange={(e)=>setLat(e.target.value)} placeholder="37.1234"/></label><label>경도<input value={lng} onChange={(e)=>setLng(e.target.value)} placeholder="127.1234"/></label></div>
        <div className="twoCols">
          <label>카테고리<select value={category} onChange={(e)=>setCategory(e.target.value as SpotCategory)}><option value="river">강/호수</option><option value="sea">바다</option><option value="mountain">산/숲</option><option value="city">도시</option><option value="night">야경</option><option value="sunset">일몰</option></select></label>
          <label>비행 난이도<select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as Difficulty)}><option value="easy">쉬움</option><option value="normal">보통</option><option value="hard">어려움</option></select></label>
        </div>
        <div className="twoCols">
          <label>주의 수준<select value={cautionLevel} onChange={(e)=>setCautionLevel(e.target.value as CautionLevel)}><option value="easy">비교적 쉬움</option><option value="caution">주의 필요</option><option value="approval">승인/확인 강력 필요</option><option value="unknown">정보 부족</option></select></label>
          <label>주차<select value={parking} onChange={(e)=>setParking(e.target.value as Parking)}><option value="good">가능/쉬움</option><option value="normal">보통</option><option value="bad">어려움</option><option value="unknown">정보 부족</option></select></label>
        </div>
        <div className="twoCols">
          <label>이륙 공간<select value={takeoffSpace} onChange={(e)=>setTakeoffSpace(e.target.value as TakeoffSpace)}><option value="wide">넓음</option><option value="normal">보통</option><option value="narrow">협소</option><option value="unknown">정보 부족</option></select></label>
          <label>사람 많음<select value={crowdLevel} onChange={(e)=>setCrowdLevel(e.target.value as CrowdLevel)}><option value="low">적음</option><option value="normal">보통</option><option value="high">많음</option><option value="unknown">정보 부족</option></select></label>
        </div>
        <label>추천 시간대<input value={bestTime} onChange={(e)=>setBestTime(e.target.value)} placeholder="일출, 일몰, 야경, 겨울"/></label>
        <label>촬영 포인트<input value={viewPoints} onChange={(e)=>setViewPoints(e.target.value)} placeholder="강변, 산뷰, 도시뷰, 다리, 바다"/></label>
        <label>주의사항<input value={cautions} onChange={(e)=>setCautions(e.target.value)} placeholder="전선, 나무, 군부대, 민가, 바람 강함"/></label>
        <label>현장 메모<textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="주차, 사람, 바람, 민원, 촬영각 등"/></label>
        <label>이륙 포인트<textarea value={takeoffPoint} onChange={(e)=>setTakeoffPoint(e.target.value)} placeholder="어디서 띄우기 편했는지"/></label>
        <label>태그<input value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="일몰, 강, 주차쉬움"/></label>
        <div className="modalActions"><button type="button" className="outlineButton" onClick={close}>취소</button><button type="submit" className="primaryButton">저장</button></div>
      </form>
    </div>
  );
}
