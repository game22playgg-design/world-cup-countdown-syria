// World Cup 2026 — sample fixture data
// kickoffUtc: ISO UTC timestamps. Displayed in Syria time (UTC+3) at runtime.
// Flags via Unicode regional indicator pairs.

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "final";

export interface Match {
  id: string;
  kickoffUtc: string;
  homeName: string;
  homeFlag: string;
  homeNameAr: string;
  awayName: string;
  awayFlag: string;
  awayNameAr: string;
  group?: string; // "A" - "L"
  stage: Stage;
  city: string;
  stadium: string;
}

const F = (a: string, b: string) =>
  String.fromCodePoint(0x1f1e6 + a.charCodeAt(0) - 65, 0x1f1e6 + b.charCodeAt(0) - 65);

export const MATCHES: Match[] = [
  // Group stage openers
  { id: "1",  kickoffUtc: "2026-06-11T23:00:00Z", homeName: "Mexico",      homeFlag: F("M","X"), homeNameAr: "المكسيك",   awayName: "Morocco",  awayFlag: F("M","A"), awayNameAr: "المغرب",    group: "A", stage: "group", city: "Mexico City",   stadium: "Estadio Azteca" },
  { id: "2",  kickoffUtc: "2026-06-12T20:00:00Z", homeName: "Canada",      homeFlag: F("C","A"), homeNameAr: "كندا",      awayName: "Ecuador",  awayFlag: F("E","C"), awayNameAr: "الإكوادور", group: "B", stage: "group", city: "Toronto",       stadium: "BMO Field" },
  { id: "3",  kickoffUtc: "2026-06-12T23:00:00Z", homeName: "USA",         homeFlag: F("U","S"), homeNameAr: "أمريكا",    awayName: "Wales",    awayFlag: F("G","B"), awayNameAr: "ويلز",      group: "C", stage: "group", city: "Inglewood",     stadium: "SoFi Stadium" },
  { id: "4",  kickoffUtc: "2026-06-13T17:00:00Z", homeName: "Saudi Arabia",homeFlag: F("S","A"), homeNameAr: "السعودية",  awayName: "Tunisia",  awayFlag: F("T","N"), awayNameAr: "تونس",      group: "D", stage: "group", city: "Dallas",        stadium: "AT&T Stadium" },
  { id: "5",  kickoffUtc: "2026-06-13T20:00:00Z", homeName: "Argentina",   homeFlag: F("A","R"), homeNameAr: "الأرجنتين", awayName: "Iran",     awayFlag: F("I","R"), awayNameAr: "إيران",     group: "E", stage: "group", city: "Atlanta",       stadium: "Mercedes-Benz Stadium" },
  { id: "6",  kickoffUtc: "2026-06-13T23:00:00Z", homeName: "Spain",       homeFlag: F("E","S"), homeNameAr: "إسبانيا",   awayName: "Egypt",    awayFlag: F("E","G"), awayNameAr: "مصر",       group: "F", stage: "group", city: "Houston",       stadium: "NRG Stadium" },
  { id: "7",  kickoffUtc: "2026-06-14T19:00:00Z", homeName: "France",      homeFlag: F("F","R"), homeNameAr: "فرنسا",     awayName: "Senegal",  awayFlag: F("S","N"), awayNameAr: "السنغال",   group: "G", stage: "group", city: "Philadelphia",  stadium: "Lincoln Financial Field" },
  { id: "8",  kickoffUtc: "2026-06-14T22:00:00Z", homeName: "Germany",     homeFlag: F("D","E"), homeNameAr: "ألمانيا",   awayName: "Japan",    awayFlag: F("J","P"), awayNameAr: "اليابان",   group: "H", stage: "group", city: "Kansas City",   stadium: "Arrowhead Stadium" },
  { id: "9",  kickoffUtc: "2026-06-15T18:00:00Z", homeName: "Brazil",      homeFlag: F("B","R"), homeNameAr: "البرازيل",  awayName: "Algeria",  awayFlag: F("D","Z"), awayNameAr: "الجزائر",   group: "I", stage: "group", city: "East Rutherford",stadium: "MetLife Stadium" },
  { id: "10", kickoffUtc: "2026-06-15T21:00:00Z", homeName: "England",     homeFlag: F("G","B"), homeNameAr: "إنكلترا",   awayName: "Qatar",    awayFlag: F("Q","A"), awayNameAr: "قطر",       group: "J", stage: "group", city: "Seattle",       stadium: "Lumen Field" },
  { id: "11", kickoffUtc: "2026-06-16T19:00:00Z", homeName: "Portugal",    homeFlag: F("P","T"), homeNameAr: "البرتغال",  awayName: "Australia",awayFlag: F("A","U"), awayNameAr: "أستراليا",  group: "K", stage: "group", city: "Boston",        stadium: "Gillette Stadium" },
  { id: "12", kickoffUtc: "2026-06-16T22:00:00Z", homeName: "Netherlands", homeFlag: F("N","L"), homeNameAr: "هولندا",    awayName: "South Korea",awayFlag: F("K","R"), awayNameAr: "كوريا الجنوبية", group: "L", stage: "group", city: "Miami",     stadium: "Hard Rock Stadium" },
  { id: "13", kickoffUtc: "2026-06-17T20:00:00Z", homeName: "Belgium",     homeFlag: F("B","E"), homeNameAr: "بلجيكا",    awayName: "Croatia",  awayFlag: F("H","R"), awayNameAr: "كرواتيا",   group: "A", stage: "group", city: "Guadalajara",   stadium: "Estadio Akron" },
  { id: "14", kickoffUtc: "2026-06-17T23:00:00Z", homeName: "Uruguay",     homeFlag: F("U","Y"), homeNameAr: "الأوروغواي",awayName: "Switzerland",awayFlag: F("C","H"), awayNameAr: "سويسرا",   group: "B", stage: "group", city: "Monterrey",     stadium: "Estadio BBVA" },
  { id: "15", kickoffUtc: "2026-06-18T18:00:00Z", homeName: "Colombia",    homeFlag: F("C","O"), homeNameAr: "كولومبيا",  awayName: "Norway",   awayFlag: F("N","O"), awayNameAr: "النرويج",   group: "C", stage: "group", city: "Vancouver",     stadium: "BC Place" },
  { id: "16", kickoffUtc: "2026-06-18T21:00:00Z", homeName: "Italy",       homeFlag: F("I","T"), homeNameAr: "إيطاليا",   awayName: "Iraq",     awayFlag: F("I","Q"), awayNameAr: "العراق",    group: "D", stage: "group", city: "Atlanta",       stadium: "Mercedes-Benz Stadium" },

  // Knockouts
  { id: "k1", kickoffUtc: "2026-06-28T20:00:00Z", homeName: "1A",          homeFlag: "🏆",       homeNameAr: "أول المجموعة A", awayName: "2B",   awayFlag: "🏆",       awayNameAr: "ثاني المجموعة B", stage: "r32", city: "Dallas",     stadium: "AT&T Stadium" },
  { id: "k2", kickoffUtc: "2026-07-04T22:00:00Z", homeName: "W49",         homeFlag: "🏆",       homeNameAr: "فائز 49",       awayName: "W50",  awayFlag: "🏆",       awayNameAr: "فائز 50",        stage: "r16", city: "Los Angeles", stadium: "SoFi Stadium" },
  { id: "k3", kickoffUtc: "2026-07-11T22:00:00Z", homeName: "QF1",         homeFlag: "🏆",       homeNameAr: "ربع النهائي 1",  awayName: "QF2",  awayFlag: "🏆",       awayNameAr: "ربع النهائي 2",   stage: "qf",  city: "East Rutherford", stadium: "MetLife Stadium" },
  { id: "k4", kickoffUtc: "2026-07-15T22:00:00Z", homeName: "SF1",         homeFlag: "🏆",       homeNameAr: "نصف النهائي 1", awayName: "SF2",  awayFlag: "🏆",       awayNameAr: "نصف النهائي 2",   stage: "sf",  city: "Dallas",     stadium: "AT&T Stadium" },
  { id: "kf", kickoffUtc: "2026-07-19T19:00:00Z", homeName: "Finalist 1",  homeFlag: "🏆",       homeNameAr: "المتأهل 1",     awayName: "Finalist 2", awayFlag: "🏆", awayNameAr: "المتأهل 2",       stage: "final", city: "East Rutherford", stadium: "MetLife Stadium" },
];

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;
