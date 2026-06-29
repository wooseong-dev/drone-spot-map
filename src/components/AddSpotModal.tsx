import { FormEvent, useEffect, useState } from 'react';
import {
  CautionLevel,
  CrowdLevel,
  Difficulty,
  Parking,
  Spot,
  SpotCategory,
  TakeoffSpace,
} from '../types';
import { generateId } from '../utils';

interface AddSpotModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (spot: Spot) => Promise<void> | void;
  initialCoords?: { lat: number; lng: number };
  isAdmin: boolean;
  isLoggedIn: boolean;
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AddSpotModal({
  open,
  onClose,
  onAdd,
  initialCoords,
  isAdmin,
  isLoggedIn,
}: AddSpotModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [category, setCategory] = useState<SpotCategory>('river');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [cautionLevel, setCautionLevel] = useState<CautionLevel>('unknown');
  const [parking, setParking] = useState<Parking>('unknown');
  const [takeoffSpace, setTakeoffSpace] = useState<TakeoffSpace>('unknown');
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>('unknown');

  const [bestTime, setBestTime] = useState('');
  const [viewPoints, setViewPoints] = useState('');
  const [cautions, setCautions] = useState('');
  const [description, setDescription] = useState('');
  const [takeoffPoint, setTakeoffPoint] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !initialCoords) return;

    setLat(String(initialCoords.lat));
    setLng(String(initialCoords.lng));
  }, [open, initialCoords]);

  if (!open) return null;

  function resetForm() {
    setName('');
    setAddress('');
    setLat('');
    setLng('');
    setCategory('river');
    setDifficulty('normal');
    setCautionLevel('unknown');
    setParking('unknown');
    setTakeoffSpace('unknown');
    setCrowdLevel('unknown');
    setBestTime('');
    setViewPoints('');
    setCautions('');
    setDescription('');
    setTakeoffPoint('');
    setTags('');
    setImageUrl('');
  }

  function close() {
    resetForm();
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!isLoggedIn) {
      alert('스팟 제보는 로그인 후 이용할 수 있습니다.');
      return;
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (
      !name.trim() ||
      !address.trim() ||
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng)
    ) {
      alert('장소명, 주소/위치 설명, 위도, 경도는 필수입니다.');
      return;
    }

    const bestTimeList = splitList(bestTime);
    const viewPointList = splitList(viewPoints);
    const cautionList = splitList(cautions);
    const tagList = splitList(tags);

    const spot: Spot = {
      id: generateId('spot'),
      name: name.trim(),
      address: address.trim(),
      lat: parsedLat,
      lng: parsedLng,
      category,
      difficulty,
      cautionLevel,
      parking,
      takeoffSpace,
      crowdLevel,
      bestTime: bestTimeList.length ? bestTimeList : ['정보 필요'],
      viewPoints: viewPointList.length ? viewPointList : ['이륙 포인트 정보 필요'],
      cautions: cautionList.length ? cautionList : ['공식 확인 필요'],
      tags: tagList.length ? tagList : ['제보'],
      description:
        description.trim() ||
        '제보된 장소입니다. 상세 정보가 필요합니다.',
      takeoffPoint:
        takeoffPoint.trim() ||
        '이륙 포인트 정보가 필요합니다.',
      officialCheckUrl: 'https://drone.onestop.go.kr/',
      imageUrl: imageUrl.trim() || undefined,
      reviews: [],
    };

    try {
      setSaving(true);
      await onAdd(spot);

      alert(
        isAdmin
          ? '스팟이 바로 등록되었습니다.'
          : '스팟 제보가 접수되었습니다. 검토 후 지도에 반영됩니다.'
      );

      resetForm();
      onClose();
    } catch (error) {
      console.error('[AddSpotModal] submit failed:', error);
      alert('저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modalBackdrop">
      <form className="modal spotSubmitModal" onSubmit={submit}>
        <h2>{isAdmin ? '관리자 스팟 등록' : '스팟 제보하기'}</h2>

        <p>
          {isAdmin
            ? '관리자 계정으로 등록하는 스팟은 즉시 지도에 노출됩니다.'
            : '간단한 위치와 메모만 남겨주세요. 검토 후 지도에 반영됩니다.'}
        </p>

        {!isLoggedIn && (
          <div className="formNotice warning">
            스팟 제보는 로그인 후 이용할 수 있습니다.
          </div>
        )}

        <label>
          장소명
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 양평 두물머리 강변 포인트"
          />
        </label>

        <label>
          주소/위치 설명
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 경기 양평군 양서면..."
          />
        </label>

        <div className="twoCols">
          <label>
            위도
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.1234"
            />
          </label>

          <label>
            경도
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="127.1234"
            />
          </label>
        </div>

        <div className="twoCols">
          <label>
            카테고리
            <select value={category} onChange={(e) => setCategory(e.target.value as SpotCategory)}>
              <option value="river">강/호수</option>
              <option value="sea">바다</option>
              <option value="mountain">산/숲</option>
              <option value="city">도시</option>
              <option value="night">야경</option>
              <option value="sunset">일몰</option>
            </select>
          </label>

          <label>
            비행 난이도
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
            </select>
          </label>
        </div>

        {isAdmin && (
          <>
            <div className="twoCols">
              <label>
                주의 수준
                <select
                  value={cautionLevel}
                  onChange={(e) => setCautionLevel(e.target.value as CautionLevel)}
                >
                  <option value="easy">비교적 쉬움</option>
                  <option value="caution">주의 필요</option>
                  <option value="approval">승인/확인 강력 필요</option>
                  <option value="unknown">정보 부족</option>
                </select>
              </label>

              <label>
                주차
                <select value={parking} onChange={(e) => setParking(e.target.value as Parking)}>
                  <option value="good">가능/쉬움</option>
                  <option value="normal">보통</option>
                  <option value="bad">어려움</option>
                  <option value="unknown">정보 부족</option>
                </select>
              </label>
            </div>

            <div className="twoCols">
              <label>
                이륙 공간
                <select
                  value={takeoffSpace}
                  onChange={(e) => setTakeoffSpace(e.target.value as TakeoffSpace)}
                >
                  <option value="wide">넓음</option>
                  <option value="normal">보통</option>
                  <option value="narrow">협소</option>
                  <option value="unknown">정보 부족</option>
                </select>
              </label>

              <label>
                인파
                <select value={crowdLevel} onChange={(e) => setCrowdLevel(e.target.value as CrowdLevel)}>
                  <option value="low">적음</option>
                  <option value="normal">보통</option>
                  <option value="high">많음</option>
                  <option value="unknown">정보 부족</option>
                </select>
              </label>
            </div>
          </>
        )}

        <label>
          추천 시간대
          <input
            value={bestTime}
            onChange={(e) => setBestTime(e.target.value)}
            placeholder="예: 일출, 일몰, 겨울"
          />
        </label>

        <label>
          촬영 포인트
          <input
            value={viewPoints}
            onChange={(e) => setViewPoints(e.target.value)}
            placeholder="예: 강변, 산뷰, 다리, 바다"
          />
        </label>

        <label>
          주의사항
          <input
            value={cautions}
            onChange={(e) => setCautions(e.target.value)}
            placeholder="예: 바람 강함, 민가 주의, 공식 확인 필요"
          />
        </label>

        <label>
          현장 메모
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isAdmin
                ? '주차, 사람, 바람, 민원, 촬영각 등'
                : '이 장소를 추천하는 이유나 주의할 점을 간단히 적어주세요.'
            }
          />
        </label>

        {isAdmin && (
          <>
            <label>
              이륙 포인트
              <textarea
                value={takeoffPoint}
                onChange={(e) => setTakeoffPoint(e.target.value)}
                placeholder="어디서 띄우기 편한지"
              />
            </label>

            <label>
              대표 이미지 URL
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </>
        )}

        <label>
          태그
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="예: 일몰, 강, 주차쉬움"
          />
        </label>

        <div className="modalActions">
          <button type="button" className="outlineButton" onClick={close} disabled={saving}>
            취소
          </button>

          <button type="submit" className="primaryButton" disabled={saving || !isLoggedIn}>
            {saving
              ? '저장 중'
              : isAdmin
                ? '스팟 바로 등록'
                : '검토 요청 보내기'}
          </button>
        </div>
      </form>
    </div>
  );
}