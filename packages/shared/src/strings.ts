/** Every user-facing string. The UI is Hebrew (RTL); nothing else in the codebase is. */
export const strings = {
  appName: 'מנוחת שלום',
  admin: {
    title: 'ניהול',
    checkConnection: 'בדיקת חיבור',
  },
  display: {
    title: 'מסך תצוגה',
    notFound: 'המסך לא נמצא',
    unknownLayout: 'פריסת מסך לא מוכרת',
    waiting: 'ממתין לנתונים מהשרת…',
    weekday: { shacharit: 'שחרית', mincha: 'מנחה', arvit: 'ערבית' },
    shabbat: {
      shirHashirim: 'שיר השירים',
      minchaErev: 'מנחה ע״ש',
      shacharit: 'שחרית',
      mincha: 'מנחה',
      arvit: 'ערבית',
    },
    dailyZmanim: {
      alosHashachar: 'עלות השחר',
      seaLevelSunrise: 'נץ החמה',
      sofZmanShmaMGA: 'ס״ז שמע מג״א',
      sofZmanShmaGRA: 'ס״ז שמע גר״א',
      chatzos: 'חצות',
      sunset: 'שקיעה',
      tzais: 'צאת הכוכבים',
    },
    dafYomi: 'דף היומי',
    parasha: 'פרשת השבוע',
    candleLighting: 'הדלקת נרות',
    rabbeinuTam: 'מוצ״ש ר״ת',
    missingTime: '—',
    slideAlt: 'שקופית',
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
  defaults: {
    locationName: 'ירושלים',
    mainDisplayName: 'מסך ראשי',
  },
  desktop: {
    startupFailed: 'הפעלת התוכנה נכשלה',
  },
} as const;
