import { useEffect, useState } from 'react';
import {
  approveSpotRequest,
  fetchPendingSpotRequests,
  rejectSpotRequest,
  SpotRequest,
} from '../services/spotSubmissions';

type AdminRequestsPanelProps = {
  isAdmin: boolean;
  onChanged: () => Promise<void> | void;
};

export default function AdminRequestsPanel({
  isAdmin,
  onChanged,
}: AdminRequestsPanelProps) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<SpotRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadRequests() {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const nextRequests = await fetchPendingSpotRequests();
      setRequests(nextRequests);
    } catch (error) {
      console.error('[AdminRequestsPanel] load failed:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadRequests();
  }, [isAdmin]);

  if (!isAdmin) return null;

  async function handleApprove(requestId: string) {
    const ok = window.confirm('이 제보를 승인하고 지도에 등록할까요?');
    if (!ok) return;

    try {
      setWorkingId(requestId);
      await approveSpotRequest(requestId);
      await loadRequests();
      await onChanged();
      alert('스팟이 승인되어 지도에 등록되었습니다.');
    } catch (error) {
      console.error('[AdminRequestsPanel] approve failed:', error);
      alert('승인 중 문제가 발생했습니다.');
    } finally {
      setWorkingId(null);
    }
  }

  async function handleReject(requestId: string) {
    const note = window.prompt('반려 사유를 입력하세요. 비워도 됩니다.') ?? '';

    try {
      setWorkingId(requestId);
      await rejectSpotRequest(requestId, note);
      await loadRequests();
      alert('제보가 반려되었습니다.');
    } catch (error) {
      console.error('[AdminRequestsPanel] reject failed:', error);
      alert('반려 중 문제가 발생했습니다.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="adminRequestsPanel">
      <button
        type="button"
        className="adminRequestsToggle"
        onClick={() => setOpen((prev) => !prev)}
      >
        제보 검토 {requests.length > 0 ? requests.length : ''}
      </button>

      {open && (
        <div className="adminRequestsBox">
          <div className="adminRequestsHeader">
            <strong>스팟 제보 검토</strong>

            <button type="button" onClick={loadRequests} disabled={loading}>
              새로고침
            </button>
          </div>

          {loading && <p className="adminRequestsEmpty">불러오는 중입니다.</p>}

          {!loading && requests.length === 0 && (
            <p className="adminRequestsEmpty">대기 중인 제보가 없습니다.</p>
          )}

          {!loading && requests.length > 0 && (
            <div className="adminRequestsList">
              {requests.map((request) => (
                <article key={request.id} className="adminRequestCard">
                  <strong>{request.name}</strong>

                  <p>{request.address}</p>

                  <small>
                    {request.lat.toFixed(5)}, {request.lng.toFixed(5)}
                  </small>

                  {request.description && <p>{request.description}</p>}

                  <div className="adminRequestActions">
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={() => handleApprove(request.id)}
                      disabled={workingId === request.id}
                    >
                      승인
                    </button>

                    <button
                      type="button"
                      className="outlineButton"
                      onClick={() => handleReject(request.id)}
                      disabled={workingId === request.id}
                    >
                      반려
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}