/** Every user-facing string. The UI is Hebrew (RTL); nothing else in the codebase is. */
export const strings = {
  appName: 'מנוחת שלום',
  admin: {
    title: 'ניהול',
    checkConnection: 'בדיקת חיבור',
  },
  display: {
    title: 'מסך תצוגה',
  },
  health: {
    checking: 'בודק חיבור לשרת…',
    connected: 'מחובר לשרת',
    localClient: 'חלון מקומי',
    remoteClient: 'מכשיר מרוחק',
    version: 'גרסה',
    failed: 'אין חיבור לשרת',
  },
  notFound: 'הדף לא נמצא',
  desktop: {
    startupFailed: 'הפעלת התוכנה נכשלה',
  },
} as const;
