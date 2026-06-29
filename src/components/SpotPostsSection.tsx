import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Spot } from '../types';
import {
  createSpotPost,
  fetchSpotPosts,
  SpotPost,
} from '../services/spotPosts';

type SpotPostsSectionProps = {
  spot: Spot;
  user: User | null;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function getDisplayName(post: SpotPost) {
  if (post.author_name) return post.author_name;
  if (post.author_email) return post.author_email;
  return '드론스팟맵 사용자';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return '등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

export default function SpotPostsSection({ spot, user }: SpotPostsSectionProps) {
  const [posts, setPosts] = useState<SpotPost[]>([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasPosts = posts.length > 0;

  const fileLabel = useMemo(() => {
    if (!file) return '사진 선택';
    return file.name;
  }, [file]);

  async function loadPosts() {
    try {
      setLoading(true);
      const nextPosts = await fetchSpotPosts(spot.id);
      setPosts(nextPosts);
    } catch (error) {
      console.error('[SpotPostsSection] load failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setContent('');
    setFile(null);
    setPreviewUrl(null);
    setFileInputKey((prev) => prev + 1);
  }

  useEffect(() => {
    setPosts([]);
    resetForm();
    loadPosts();
  }, [spot.id]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      alert('JPG, PNG, WEBP 이미지만 올릴 수 있습니다.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('사진은 5MB 이하만 올릴 수 있습니다.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!user) {
      alert('사진과 멘트는 로그인 후 올릴 수 있습니다.');
      return;
    }

    if (!content.trim() && !file) {
      alert('사진이나 멘트 중 하나는 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const created = await createSpotPost({
        spotId: spot.id,
        user,
        content,
        file,
      });

      setPosts((prev) => [created, ...prev]);
      resetForm();

      window.dispatchEvent(
        new CustomEvent('spot-post-created', {
          detail: { spotId: spot.id },
        })
      );

      alert('현장 사진/멘트가 등록되었습니다.');
    } catch (error) {
      console.error('[SpotPostsSection] submit failed:', error);
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="spotPostsSection">
      <div className="spotPostsHeader">
        <div>
          <h3>현장 사진 · 짧은 멘트</h3>
          <p>이 스팟을 다녀온 사람들이 남긴 사진과 간단한 메모입니다.</p>
        </div>

        <button type="button" onClick={loadPosts} disabled={loading || saving}>
          새로고침
        </button>
      </div>

      <form className="spotPostForm" onSubmit={handleSubmit}>
        {!user && (
          <div className="spotPostLoginNotice">
            로그인하면 이 스팟의 사진이나 짧은 멘트를 남길 수 있습니다.
          </div>
        )}

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="예: 주말 오후에는 사람이 많았고, 일몰 시간대가 좋았습니다."
          maxLength={300}
          disabled={!user || saving}
        />

        <div className="spotPostFormBottom">
          <label className="spotPhotoPicker">
            <input
              key={fileInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={!user || saving}
            />
            <span>{fileLabel}</span>
          </label>

          <span className="spotPostLimit">{content.length}/300</span>

          <button
            type="submit"
            className="primaryButton"
            disabled={!user || saving}
          >
            {saving ? '등록 중' : '올리기'}
          </button>
        </div>

        {previewUrl && (
          <div className="spotPostPreview">
            <img src={previewUrl} alt="업로드 미리보기" />

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setFileInputKey((prev) => prev + 1);
              }}
              disabled={saving}
            >
              사진 제거
            </button>
          </div>
        )}
      </form>

      {loading && <div className="spotPostsEmpty">불러오는 중입니다.</div>}

      {!loading && !hasPosts && (
        <div className="spotPostsEmpty">
          아직 등록된 사진이나 멘트가 없습니다. 첫 현장 기록을 남겨보세요.
        </div>
      )}

      {!loading && hasPosts && (
        <div className="spotPostsList">
          {posts.map((post) => (
            <article key={post.id} className="spotPostCard">
              {post.image_url && (
                <img
                  className="spotPostImage"
                  src={post.image_url}
                  alt=""
                  loading="lazy"
                />
              )}

              <div className="spotPostBody">
                <div className="spotPostMeta">
                  <strong>{getDisplayName(post)}</strong>
                  <span>{formatDate(post.createdAt)}</span>
                </div>

                {post.content && <p>{post.content}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}