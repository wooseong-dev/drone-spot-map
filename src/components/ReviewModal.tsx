import { FormEvent, useState } from 'react';
import { Review } from '../types';
import { generateId } from '../utils';

interface ReviewModalProps { open: boolean; spotName?: string; onClose: () => void; onAdd: (review: Review) => void; }

export default function ReviewModal({ open, spotName, onClose, onAdd }: ReviewModalProps) {
  const [nickname,setNickname]=useState('익명조종자'); const [rating,setRating]=useState(4); const [content,setContent]=useState('');
  if (!open) return null;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) { alert('후기 내용을 입력해줘.'); return; }
    onAdd({ id: generateId('review'), nickname, rating, content, createdAt: new Date().toISOString().slice(0,10) });
    setContent(''); onClose();
  }
  return (
    <div className="modalBackdrop">
      <form className="modal" onSubmit={submit}>
        <h2>후기 쓰기</h2><p>{spotName}</p>
        <label>닉네임<input value={nickname} onChange={(e)=>setNickname(e.target.value)}/></label>
        <label>평점<select value={rating} onChange={(e)=>setRating(Number(e.target.value))}><option value={5}>5점</option><option value={4}>4점</option><option value={3}>3점</option><option value={2}>2점</option><option value={1}>1점</option></select></label>
        <label>후기<textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="주차, 사람, 바람, 민원, 이륙 포인트, 추천 시간대 등을 적어줘."/></label>
        <div className="modalActions"><button type="button" className="outlineButton" onClick={onClose}>취소</button><button type="submit" className="primaryButton">등록</button></div>
      </form>
    </div>
  );
}
