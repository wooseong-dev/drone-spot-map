import { ShieldAlert } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="disclaimer">
      <ShieldAlert size={18} />
      <span>
        제한구역 레이어는 참고용입니다. 실제 비행 전 드론원스톱, DJI Fly Safe, 관제권·군·촬영금지시설 여부를 반드시 공식 확인하세요.
      </span>
    </div>
  );
}
