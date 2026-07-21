export const WEBAPP_URL = 'https://app.paimal.com';
export const SIGNUP_URL = `${WEBAPP_URL}/login?mode=register`;
export const LOGIN_URL = `${WEBAPP_URL}/login`;
export const CONTACT_EMAIL = 'support@paimal.com';

// Android app distribution. We deliberately do NOT host a raw .apk on the
// marketing domain — a directly-downloadable APK at a predictable path is a
// classic trigger for ISP/anti-malware spam classifiers (it got paimal.com
// DNS-blocked by Airtel once). Until the Play Store listing is live, Android
// users install the PWA; afterwards, set ANDROID_ON_PLAY_STORE = true and fill
// in PLAY_STORE_URL and the button becomes "Get it on Google Play".
export const ANDROID_ON_PLAY_STORE = false;
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fieldpilot.mobile';
