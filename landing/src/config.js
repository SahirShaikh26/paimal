export const WEBAPP_URL = 'https://app.paimal.com';
export const SIGNUP_URL = `${WEBAPP_URL}/login?mode=register`;
export const LOGIN_URL = `${WEBAPP_URL}/login`;
export const CONTACT_EMAIL = 'hello@paimal.com';

// Android app download. Served as a static file from our own domain today; when
// the Play Store listing goes live, point this at the store URL and flip
// ANDROID_ON_PLAY_STORE to true — the button switches from a direct download to
// a new-tab store link and the install caveat disappears. Nothing else changes.
export const ANDROID_DOWNLOAD_URL = '/download/paimal.apk';
export const ANDROID_ON_PLAY_STORE = false;
