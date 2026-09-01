import React, { useEffect, useState } from 'react';
import { getPhotoUrl } from '../lib/api.js';

let cachedDefaultAvatar = null;
let defaultAvatarLoading = null;

async function loadDefaultAvatar() {
  if (cachedDefaultAvatar) return cachedDefaultAvatar;
  if (!defaultAvatarLoading) {
    defaultAvatarLoading = fetch('/api/site-settings')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        cachedDefaultAvatar = d.default_avatar_url || '/default-student-avatar.svg';
        return cachedDefaultAvatar;
      })
      .catch(() => '/default-student-avatar.svg');
  }
  return defaultAvatarLoading;
}

/**
 * Shared student avatar.
 *
 * Priority:
 *  1. Student's uploaded photo.
 *  2. Super-admin selected default avatar from School & Branding.
 *  3. Built-in school-themed SVG fallback.
 */
export default function StudentAvatar({ student, className = '', alt = 'Student', large = false }) {
  const [broken, setBroken] = useState(false);
  const [defaultBroken, setDefaultBroken] = useState(false);
  const [defaultAvatar, setDefaultAvatar] = useState(cachedDefaultAvatar || '/default-student-avatar.svg');

  useEffect(() => {
    let mounted = true;
    loadDefaultAvatar().then((url) => mounted && setDefaultAvatar(url));

    const refresh = () => {
      cachedDefaultAvatar = null;
      defaultAvatarLoading = null;
      loadDefaultAvatar().then((url) => mounted && setDefaultAvatar(url));
    };

    window.addEventListener('site-settings-updated', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', refresh);
    };
  }, []);

  const hasStudentPhoto = Boolean(student?.photo_path) && !broken;
  const src = hasStudentPhoto
    ? getPhotoUrl(student.photo_path)
    : (defaultBroken ? '/default-student-avatar.svg' : defaultAvatar);

  return (
    <img
      className={`${className} ${large ? 'large' : ''}`.trim()}
      src={src}
      alt={alt}
      onError={() => (hasStudentPhoto ? setBroken(true) : setDefaultBroken(true))}
      loading="lazy"
      decoding="async"
      data-default-avatar={!hasStudentPhoto ? 'true' : 'false'}
    />
  );
}
