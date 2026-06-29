import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type SpotPost = {
  id: string;
  spot_id: string;
  user_id: string;
  author_email: string | null;
  author_name: string | null;
  content: string;
  image_url: string | null;
  image_path: string | null;
  status: 'visible' | 'hidden' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

function getFileExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'jpg') return 'jpg';
  if (extension === 'jpeg') return 'jpeg';
  if (extension === 'png') return 'png';
  if (extension === 'webp') return 'webp';

  return 'jpg';
}

function getAuthorName(user: User) {
  const metadata = user.user_metadata ?? {};

  return (
    metadata.full_name ??
    metadata.name ??
    metadata.nickname ??
    metadata.preferred_username ??
    null
  );
}

export async function fetchSpotPosts(spotId: string) {
  const { data, error } = await supabase
    .from('spot_posts')
    .select('*')
    .eq('spot_id', spotId)
    .eq('status', 'visible')
    .order('createdAt', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[SpotPosts] fetch failed:', error);
    return [];
  }

  return (data ?? []) as SpotPost[];
}

export async function uploadSpotPhoto({
  spotId,
  user,
  file,
}: {
  spotId: string;
  user: User;
  file: File;
}) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('사진은 5MB 이하만 업로드할 수 있습니다.');
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
  }

  const extension = getFileExtension(file);
  const path = `${user.id}/${spotId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('spot-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[SpotPosts] upload failed:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('spot-photos').getPublicUrl(path);

  return {
    imagePath: path,
    imageUrl: data.publicUrl,
  };
}

export async function createSpotPost({
  spotId,
  user,
  content,
  file,
}: {
  spotId: string;
  user: User;
  content: string;
  file?: File | null;
}) {
  const trimmedContent = content.trim();

  if (!trimmedContent && !file) {
    throw new Error('사진이나 멘트 중 하나는 필요합니다.');
  }

  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (file) {
    const uploaded = await uploadSpotPhoto({
      spotId,
      user,
      file,
    });

    imageUrl = uploaded.imageUrl;
    imagePath = uploaded.imagePath;
  }

  const { data, error } = await supabase
    .from('spot_posts')
    .insert({
      spot_id: spotId,
      user_id: user.id,
      author_email: user.email ?? null,
      author_name: getAuthorName(user),
      content: trimmedContent,
      image_url: imageUrl,
      image_path: imagePath,
      status: 'visible',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[SpotPosts] create failed:', error);
    throw error;
  }

  return data as SpotPost;
}
export async function fetchSpotPostPreviews(spotIds: string[]) {
  if (spotIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('spot_posts')
    .select('*')
    .in('spot_id', spotIds)
    .eq('status', 'visible')
    .order('createdAt', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[SpotPosts] preview fetch failed:', error);
    return {};
  }

  const previews: Record<string, SpotPost> = {};

  for (const post of (data ?? []) as SpotPost[]) {
    if (!previews[post.spot_id]) {
      previews[post.spot_id] = post;
    }
  }

  return previews;
}