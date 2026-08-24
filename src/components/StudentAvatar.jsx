import React, { useEffect, useState } from 'react';
import { getPhotoUrl } from '../lib/api.js';

const BUILT_IN_DEFAULT = '/default-student-avatar.svg';
let cachedDefaultAvatar = null;
let defaultAvatarLoading = null;

async function loadDefaultAvatar(force = false) {
  if (!force && cachedDefaultAvatar) return cachedDefaultAvatar;
  if (!defaultAvatarLoading || force) {
    const url = `/api/site-settings?avatar_cache=${Date.now()}`;
    defaultAvatarLoading = fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const value = typeof d?.default_avatar_url === 'string' ? d.default_avatar_url.trim() : '';
        cachedDefaultAvatar = value || BUILT_IN_DEFAULT;
        return cachedDefaultAvatar;
      })
      .catch(() => {
        cachedDefaultAvatar = BUILT_IN_DEFAULT;
        return cachedDefaultAvatar;
      });
  }
  return defaultAvatarLoading;
}

export function refreshDefaultStudentAvatar() {
  cachedDefaultAvatar = null;
  defaultAvatarLoading = null;
  return loadDefaultAvatar(true);
}

/** Shared student avatar priority: uploaded student photo -> admin-selected default -> built-in fallback. */
export default function StudentAvatar({ student, className = '', alt = 'Student', large = false }) {
  const [broken, setBroken] = useState(false);
  const [defaultBroken, setDefaultBroken] = useState(false);
  const [defaultAvatar, setDefaultAvatar] = useState(cachedDefaultAvatar || BUILT_IN_DEFAULT);

  useEffect(() => {
    let mounted = true;
    loadDefaultAvatar().then((url) => mounted && setDefaultAvatar(url));

    const refresh = () => {
      refreshDefaultStudentAvatar().then((url) => mounted && setDefaultAvatar(url));
      if (mounted) setDefaultBroken(false);
    };

    window.addEventListener('site-settings-updated', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', refresh);
    };
  }, []);

  const photoPath = student?.photo_path || student?.avatar_path || null;
  const hasStudentPhoto = Boolean(photoPath) && !broken;
  const src = hasStudentPhoto
    ? getPhotoUrl(photoPath)
    : (defaultBroken ? BUILT_IN_DEFAULT : defaultAvatar);

  return (
    <img
      className={`${className}${large ? ' large' : ''}`}
      src={src}
      alt={alt}
      onError={() => (hasStudentPhoto ? setBroken(true) : setDefaultBroken(true))}
      loading="lazy"
      decoding="async"
      data-default-avatar={!hasStudentPhoto ? 'true' : 'false'}
    />
  );
}
