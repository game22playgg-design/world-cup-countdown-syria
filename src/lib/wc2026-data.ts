// World Cup 2026 — Round of 32 fixtures (June 28 – July 3, 2026)
// Source: Wikipedia / FIFA official schedule.
// kickoffUtc: ISO UTC timestamps. Displayed in Syria time (UTC+3) at runtime.
// Finished matches are filtered out in the UI based on current time.

export type Stage = "r32" | "r16" | "qf" | "sf" | "final";

export interface Match {
  id: string;
  kickoffUtc: string;
  homeName: string;
  homeFlag: string;
  homeNameAr: string;
  awayName: string;
  awayFlag: string;
  awayNameAr: string;
  stage: Stage;
  city: string;
  stadium: string;
  stadiumAr: string;
  cityAr: string;
}

const F = (a: string, b: string) =>
  String.fromCodePoint(0x1f1e6 + a.charCodeAt(0) - 65, 0x1f1e6 + b.charCodeAt(0) - 65);

// All times converted from local venue time to UTC.
export const MATCHES: Match[] = [
  // Saturday June 28
  { id: "r32-1",  kickoffUtc: "2026-06-28T19:00:00Z",
    homeName: "South Africa", homeFlag: F("Z","A"), homeNameAr: "جنوب أفريقيا",
    awayName: "Canada",       awayFlag: F("C","A"), awayNameAr: "كندا",
    stage: "r32", city: "Inglewood", cityAr: "إنغلوود", stadium: "SoFi Stadium", stadiumAr: "ملعب سوفاي" },

  // Sunday June 29
  { id: "r32-2",  kickoffUtc: "2026-06-29T17:00:00Z",
    homeName: "Brazil", homeFlag: F("B","R"), homeNameAr: "البرازيل",
    awayName: "Japan",  awayFlag: F("J","P"), awayNameAr: "اليابان",
    stage: "r32", city: "Houston", cityAr: "هيوستن", stadium: "NRG Stadium", stadiumAr: "ملعب NRG" },
  { id: "r32-3",  kickoffUtc: "2026-06-29T20:30:00Z",
    homeName: "Germany",  homeFlag: F("D","E"), homeNameAr: "ألمانيا",
    awayName: "Paraguay", awayFlag: F("P","Y"), awayNameAr: "باراغواي",
    stage: "r32", city: "Foxborough", cityAr: "فوكسبورو", stadium: "Gillette Stadium", stadiumAr: "ملعب جيليت" },
  { id: "r32-4",  kickoffUtc: "2026-06-30T01:00:00Z",
    homeName: "Netherlands", homeFlag: F("N","L"), homeNameAr: "هولندا",
    awayName: "Morocco",     awayFlag: F("M","A"), awayNameAr: "المغرب",
    stage: "r32", city: "Guadalupe", cityAr: "غوادالوبي", stadium: "Estadio BBVA", stadiumAr: "ملعب BBVA" },

  // Monday June 30
  { id: "r32-5",  kickoffUtc: "2026-06-30T17:00:00Z",
    homeName: "Ivory Coast", homeFlag: F("C","I"), homeNameAr: "كوت ديفوار",
    awayName: "Norway",      awayFlag: F("N","O"), awayNameAr: "النرويج",
    stage: "r32", city: "Arlington", cityAr: "أرلينغتون", stadium: "AT&T Stadium", stadiumAr: "ملعب AT&T" },
  { id: "r32-6",  kickoffUtc: "2026-06-30T21:00:00Z",
    homeName: "France", homeFlag: F("F","R"), homeNameAr: "فرنسا",
    awayName: "Sweden", awayFlag: F("S","E"), awayNameAr: "السويد",
    stage: "r32", city: "East Rutherford", cityAr: "إيست رذرفورد", stadium: "MetLife Stadium", stadiumAr: "ملعب ميتلايف" },
  { id: "r32-7",  kickoffUtc: "2026-07-01T01:00:00Z",
    homeName: "Mexico",  homeFlag: F("M","X"), homeNameAr: "المكسيك",
    awayName: "Ecuador", awayFlag: F("E","C"), awayNameAr: "الإكوادور",
    stage: "r32", city: "Mexico City", cityAr: "مكسيكو سيتي", stadium: "Estadio Azteca", stadiumAr: "ملعب أزتيكا" },

  // Wednesday July 1
  { id: "r32-8",  kickoffUtc: "2026-07-01T16:00:00Z",
    homeName: "England",  homeFlag: F("G","B"), homeNameAr: "إنكلترا",
    awayName: "DR Congo", awayFlag: F("C","D"), awayNameAr: "الكونغو الديمقراطية",
    stage: "r32", city: "Atlanta", cityAr: "أتلانتا", stadium: "Mercedes-Benz Stadium", stadiumAr: "ملعب مرسيدس-بنز" },
  { id: "r32-9",  kickoffUtc: "2026-07-01T20:00:00Z",
    homeName: "Belgium", homeFlag: F("B","E"), homeNameAr: "بلجيكا",
    awayName: "Senegal", awayFlag: F("S","N"), awayNameAr: "السنغال",
    stage: "r32", city: "Seattle", cityAr: "سياتل", stadium: "Lumen Field", stadiumAr: "ملعب لومن" },
  { id: "r32-10", kickoffUtc: "2026-07-02T00:00:00Z",
    homeName: "United States",         homeFlag: F("U","S"), homeNameAr: "الولايات المتحدة",
    awayName: "Bosnia and Herzegovina", awayFlag: F("B","A"), awayNameAr: "البوسنة والهرسك",
    stage: "r32", city: "Santa Clara", cityAr: "سانتا كلارا", stadium: "Levi's Stadium", stadiumAr: "ملعب ليفايز" },

  // Thursday July 2
  { id: "r32-11", kickoffUtc: "2026-07-02T19:00:00Z",
    homeName: "Spain",   homeFlag: F("E","S"), homeNameAr: "إسبانيا",
    awayName: "Austria", awayFlag: F("A","T"), awayNameAr: "النمسا",
    stage: "r32", city: "Inglewood", cityAr: "إنغلوود", stadium: "SoFi Stadium", stadiumAr: "ملعب سوفاي" },
  { id: "r32-12", kickoffUtc: "2026-07-02T23:00:00Z",
    homeName: "Portugal", homeFlag: F("P","T"), homeNameAr: "البرتغال",
    awayName: "Croatia",  awayFlag: F("H","R"), awayNameAr: "كرواتيا",
    stage: "r32", city: "Toronto", cityAr: "تورنتو", stadium: "BMO Field", stadiumAr: "ملعب BMO" },
  { id: "r32-13", kickoffUtc: "2026-07-03T03:00:00Z",
    homeName: "Switzerland", homeFlag: F("C","H"), homeNameAr: "سويسرا",
    awayName: "Algeria",     awayFlag: F("D","Z"), awayNameAr: "الجزائر",
    stage: "r32", city: "Vancouver", cityAr: "فانكوفر", stadium: "BC Place", stadiumAr: "ملعب BC بليس" },

  // Friday July 3
  { id: "r32-14", kickoffUtc: "2026-07-03T18:00:00Z",
    homeName: "Australia", homeFlag: F("A","U"), homeNameAr: "أستراليا",
    awayName: "Egypt",     awayFlag: F("E","G"), awayNameAr: "مصر",
    stage: "r32", city: "Arlington", cityAr: "أرلينغتون", stadium: "AT&T Stadium", stadiumAr: "ملعب AT&T" },
  { id: "r32-15", kickoffUtc: "2026-07-03T22:00:00Z",
    homeName: "Argentina",  homeFlag: F("A","R"), homeNameAr: "الأرجنتين",
    awayName: "Cape Verde", awayFlag: F("C","V"), awayNameAr: "الرأس الأخضر",
    stage: "r32", city: "Miami Gardens", cityAr: "ميامي غاردنز", stadium: "Hard Rock Stadium", stadiumAr: "ملعب هارد روك" },
  { id: "r32-16", kickoffUtc: "2026-07-04T01:30:00Z",
    homeName: "Colombia", homeFlag: F("C","O"), homeNameAr: "كولومبيا",
    awayName: "Ghana",    awayFlag: F("G","H"), awayNameAr: "غانا",
    stage: "r32", city: "Kansas City", cityAr: "كانساس سيتي", stadium: "Arrowhead Stadium", stadiumAr: "ملعب آروهيد" },

  // ============ Round of 16 (July 5 – 8, 2026) ============
  { id: "r16-1", kickoffUtc: "2026-07-05T17:00:00Z",
    homeName: "Canada", homeFlag: F("C","A"), homeNameAr: "كندا",
    awayName: "Brazil", awayFlag: F("B","R"), awayNameAr: "البرازيل",
    stage: "r16", city: "Dallas", cityAr: "دالاس", stadium: "AT&T Stadium", stadiumAr: "ملعب AT&T" },
  { id: "r16-2", kickoffUtc: "2026-07-05T21:00:00Z",
    homeName: "Germany",     homeFlag: F("D","E"), homeNameAr: "ألمانيا",
    awayName: "Netherlands", awayFlag: F("N","L"), awayNameAr: "هولندا",
    stage: "r16", city: "Philadelphia", cityAr: "فيلادلفيا", stadium: "Lincoln Financial Field", stadiumAr: "ملعب لينكولن فاينانشال" },
  { id: "r16-3", kickoffUtc: "2026-07-06T17:00:00Z",
    homeName: "Norway", homeFlag: F("N","O"), homeNameAr: "النرويج",
    awayName: "France", awayFlag: F("F","R"), awayNameAr: "فرنسا",
    stage: "r16", city: "Boston", cityAr: "بوسطن", stadium: "Gillette Stadium", stadiumAr: "ملعب جيليت" },
  { id: "r16-4", kickoffUtc: "2026-07-06T21:00:00Z",
    homeName: "Mexico",  homeFlag: F("M","X"), homeNameAr: "المكسيك",
    awayName: "England", awayFlag: F("G","B"), awayNameAr: "إنكلترا",
    stage: "r16", city: "Guadalajara", cityAr: "غوادالاخارا", stadium: "Estadio Akron", stadiumAr: "ملعب أكرون" },
  { id: "r16-5", kickoffUtc: "2026-07-07T17:00:00Z",
    homeName: "Belgium",       homeFlag: F("B","E"), homeNameAr: "بلجيكا",
    awayName: "United States", awayFlag: F("U","S"), awayNameAr: "الولايات المتحدة",
    stage: "r16", city: "New York", cityAr: "نيويورك", stadium: "MetLife Stadium", stadiumAr: "ملعب ميتلايف" },
  { id: "r16-6", kickoffUtc: "2026-07-07T21:00:00Z",
    homeName: "Spain",    homeFlag: F("E","S"), homeNameAr: "إسبانيا",
    awayName: "Portugal", awayFlag: F("P","T"), awayNameAr: "البرتغال",
    stage: "r16", city: "Los Angeles", cityAr: "لوس أنجلوس", stadium: "SoFi Stadium", stadiumAr: "ملعب سوفاي" },
  { id: "r16-7", kickoffUtc: "2026-07-08T18:00:00Z",
    homeName: "Switzerland", homeFlag: F("C","H"), homeNameAr: "سويسرا",
    awayName: "Australia",   awayFlag: F("A","U"), awayNameAr: "أستراليا",
    stage: "r16", city: "Houston", cityAr: "هيوستن", stadium: "NRG Stadium", stadiumAr: "ملعب NRG" },
  { id: "r16-8", kickoffUtc: "2026-07-08T22:00:00Z",
    homeName: "Argentina", homeFlag: F("A","R"), homeNameAr: "الأرجنتين",
    awayName: "Colombia",  awayFlag: F("C","O"), awayNameAr: "كولومبيا",
    stage: "r16", city: "Miami", cityAr: "ميامي", stadium: "Hard Rock Stadium", stadiumAr: "ملعب هارد روك" },
];

export const CURRENT_ROUND_AR = "دور الـ16";
export const CURRENT_ROUND_DATES_AR = "5 – 8 تموز 2026";
