import { FormEvent, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthButtonProps = {
  user: User | null;
};

function getRedirectTo() {
  return window.location.origin;
}

export default function AuthButton({ user }: AuthButtonProps) {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'kakao' | null>(null);

  async function signInWithKakao() {
    try {
      setOauthLoading('kakao');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: getRedirectTo(),

          // 중요:
          // account_email 권한이 없으므로 이메일을 요청하지 않는다.
          // 카카오 동의항목에 설정된 nickname/profile image만 요청한다.
          scopes: 'profile_nickname profile_image',

          // Kakao 쪽은 comma-separated scope를 쓰는 경우가 있어
          // 확실하게 queryParams로도 한 번 더 제한한다.
          queryParams: {
            scope: 'profile_nickname,profile_image',
          },
        },
      });

      if (error) {
        console.error('[Auth] Kakao login failed:', error);
        alert('카카오 로그인 중 문제가 발생했습니다.');
      }
    } finally {
      setOauthLoading(null);
    }
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      alert('이메일을 입력해주세요.');
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: getRedirectTo(),
        },
      });

      if (error) {
        console.error('[Auth] Magic link failed:', error);
        alert('로그인 메일 발송 중 문제가 발생했습니다.');
        return;
      }

      alert('로그인 링크를 이메일로 보냈습니다.');
      setEmail('');
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Sign out failed:', error);
      alert('로그아웃 중 문제가 발생했습니다.');
    }
  }

  if (user) {
    return (
      <div className="authBox">
        <div className="authStatus">
          <span>로그인 상태</span>
          <strong>{user.email ?? '카카오 로그인 사용자'}</strong>
        </div>

        <button type="button" className="authLogoutButton" onClick={signOut}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="authBox">
      <button
        type="button"
        className="kakaoLoginButton"
        onClick={signInWithKakao}
        disabled={oauthLoading === 'kakao'}
      >
        {oauthLoading === 'kakao' ? '카카오 연결 중' : '카카오로 시작하기'}
      </button>

      <button
        type="button"
        className="authEmailToggle"
        onClick={() => setOpen((prev) => !prev)}
      >
        이메일로 로그인
      </button>

      {open && (
        <form className="authEmailForm" onSubmit={sendMagicLink}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            type="email"
          />

          <button type="submit" disabled={sending}>
            {sending ? '발송 중' : '로그인 링크 받기'}
          </button>
        </form>
      )}

      <p className="authHelpText">
        로그인하면 즐겨찾기, 가보고 싶음, 스팟 제보 기능을 사용할 수 있습니다.
      </p>
    </div>
  );
}