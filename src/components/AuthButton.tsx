import { FormEvent, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthButtonProps = {
  user: User | null;
};

export default function AuthButton({ user }: AuthButtonProps) {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage('이메일을 입력해줘.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      console.error('[Supabase] Login error:', error);
      setMessage('로그인 메일 발송에 실패했어.');
      return;
    }

    setMessage('로그인 링크를 이메일로 보냈어. 메일함을 확인해줘.');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  if (user) {
    return (
      <div className="authBox">
        <div className="authUser">
          <span className="authLabel">로그인됨</span>
          <strong>{user.email}</strong>
        </div>
        <button className="secondaryButton" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="authBox">
      {!open ? (
        <button className="primaryButton" type="button" onClick={() => setOpen(true)}>
          로그인하고 북마크 저장
        </button>
      ) : (
        <form className="authForm" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="이메일 입력"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="primaryButton" type="submit" disabled={loading}>
            {loading ? '보내는 중...' : '로그인 링크 받기'}
          </button>
          <button
            className="secondaryButton"
            type="button"
            onClick={() => {
              setOpen(false);
              setMessage('');
            }}
          >
            닫기
          </button>
          {message && <p className="authMessage">{message}</p>}
        </form>
      )}
    </div>
  );
}