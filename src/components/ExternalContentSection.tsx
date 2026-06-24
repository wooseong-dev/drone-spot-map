import { useEffect, useMemo, useState } from 'react';
import { Spot } from '../types';
import {
  ExternalContent,
  ExternalContentSource,
  fetchExternalContents,
} from '../services/externalContents';

type ExternalContentSectionProps = {
  spot: Spot;
};

const sourceLabels: Record<ExternalContentSource, string> = {
  naver_blog: '블로그',
  tistory: '티스토리',
  web: '웹문서',
  youtube: '유튜브',
};

function formatDate(value: string | null) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function getSourceClass(source: ExternalContentSource) {
  if (source === 'youtube') return 'youtube';
  if (source === 'naver_blog') return 'blog';
  if (source === 'tistory') return 'tistory';
  return 'web';
}

export default function ExternalContentSection({ spot }: ExternalContentSectionProps) {
  const [items, setItems] = useState<ExternalContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<'all' | ExternalContentSource>(
    'all'
  );

  useEffect(() => {
    let ignore = false;

    async function loadContents() {
      setLoading(true);
      setItems([]);
      setActiveSource('all');

      const nextItems = await fetchExternalContents(spot.id);

      if (!ignore) {
        setItems(nextItems);
        setLoading(false);
      }
    }

    loadContents();

    return () => {
      ignore = true;
    };
  }, [spot.id]);

  const filteredItems = useMemo(() => {
    if (activeSource === 'all') return items;
    return items.filter((item) => item.source === activeSource);
  }, [items, activeSource]);

  const sourceCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.source] = (acc[item.source] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  return (
    <section className="externalContentSection">
      <div className="externalContentHeader">
        <div>
          <h3>{spot.name} 관련 촬영 후기</h3>
          <p>
            블로그, 영상, 웹문서에서 이 스팟과 관련된 외부 정보를 모아 보여드립니다.
          </p>
        </div>
      </div>

      <div className="externalTabs">
        <button
          type="button"
          className={activeSource === 'all' ? 'active' : ''}
          onClick={() => setActiveSource('all')}
        >
          전체 {items.length}
        </button>

        {(['naver_blog', 'youtube', 'tistory', 'web'] as ExternalContentSource[]).map(
          (source) => (
            <button
              key={source}
              type="button"
              className={activeSource === source ? 'active' : ''}
              onClick={() => setActiveSource(source)}
            >
              {sourceLabels[source]} {sourceCounts[source] ?? 0}
            </button>
          )
        )}
      </div>

      {loading && <div className="externalEmpty">관련 콘텐츠를 불러오는 중입니다.</div>}

      {!loading && filteredItems.length === 0 && (
        <div className="externalEmpty">
          아직 수집된 관련 콘텐츠가 없습니다. 외부 콘텐츠는 주기적으로 자동 갱신됩니다.
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="externalContentList">
          {filteredItems.map((item) => (
            <a
              key={item.id}
              className="externalContentCard"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className={`externalSourceThumb ${getSourceClass(item.source)}`}>
                  {sourceLabels[item.source]}
                </div>
              )}

              <div className="externalContentBody">
                <div className="externalMeta">
                  <span className={getSourceClass(item.source)}>
                    {sourceLabels[item.source]}
                  </span>
                  {item.author && <span>{item.author}</span>}
                  {formatDate(item.published_at) && (
                    <span>{formatDate(item.published_at)}</span>
                  )}
                </div>

                <strong>{item.title}</strong>

                {item.description && <p>{item.description}</p>}
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="externalNotice">
        외부 콘텐츠는 원문 일부 미리보기와 링크만 제공합니다. 실제 비행 가능 여부는 반드시 공식 경로로 확인해주세요.
      </p>
    </section>
  );
}