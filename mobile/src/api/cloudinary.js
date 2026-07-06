// Direct unsigned upload from the device — images never pass through the
// Paimal backend, which has no file storage of its own. Requires a free
// Cloudinary account with an unsigned upload preset configured.
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadPhoto(localUri) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Photo upload is not configured');
  }

  const form = new FormData();
  form.append('file', { uri: localUri, type: 'image/jpeg', name: 'photo.jpg' });
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const data = await res.json();
  return data.secure_url;
}
