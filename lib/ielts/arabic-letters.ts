// Arabic Qaida: 29 letters with names and characteristics

export interface ArabicLetter {
  position: number; // 1-29
  arabicChar: string;
  name: string; // e.g., "Alif", "Baa", "Taa"
  nameUrdu: string; // Urdu transliteration for pronunciation
  soundHint: string; // Sound description in English for parent reference
}

export const ArabicLetters: ArabicLetter[] = [
  {
    position: 1,
    arabicChar: 'ا',
    name: 'Alif',
    nameUrdu: 'الف',
    soundHint: 'Long "a" sound like in "father"'
  },
  {
    position: 2,
    arabicChar: 'ب',
    name: 'Baa',
    nameUrdu: 'باء',
    soundHint: '"b" sound like in "ball"'
  },
  {
    position: 3,
    arabicChar: 'ت',
    name: 'Taa',
    nameUrdu: 'تاء',
    soundHint: '"t" sound like in "top"'
  },
  {
    position: 4,
    arabicChar: 'ث',
    name: 'Thaa',
    nameUrdu: 'ثاء',
    soundHint: '"th" sound like in "think"'
  },
  {
    position: 5,
    arabicChar: 'ج',
    name: 'Jeem',
    nameUrdu: 'جيم',
    soundHint: '"j" sound like in "jump"'
  },
  {
    position: 6,
    arabicChar: 'ح',
    name: 'Haa',
    nameUrdu: 'حاء',
    soundHint: 'Guttural "h" from throat'
  },
  {
    position: 7,
    arabicChar: 'خ',
    name: 'Khaa',
    nameUrdu: 'خاء',
    soundHint: 'Guttural "kh" sound'
  },
  {
    position: 8,
    arabicChar: 'د',
    name: 'Daal',
    nameUrdu: 'دال',
    soundHint: '"d" sound like in "door"'
  },
  {
    position: 9,
    arabicChar: 'ذ',
    name: 'Dhaal',
    nameUrdu: 'ذال',
    soundHint: '"th" sound like in "that"'
  },
  {
    position: 10,
    arabicChar: 'ر',
    name: 'Raa',
    nameUrdu: 'راء',
    soundHint: 'Rolled "r" sound'
  },
  {
    position: 11,
    arabicChar: 'ز',
    name: 'Zaa',
    nameUrdu: 'زاء',
    soundHint: '"z" sound like in "zoo"'
  },
  {
    position: 12,
    arabicChar: 'س',
    name: 'Seen',
    nameUrdu: 'سين',
    soundHint: '"s" sound like in "sun"'
  },
  {
    position: 13,
    arabicChar: 'ش',
    name: 'Sheen',
    nameUrdu: 'شين',
    soundHint: '"sh" sound like in "shop"'
  },
  {
    position: 14,
    arabicChar: 'ص',
    name: 'Saad',
    nameUrdu: 'صاد',
    soundHint: 'Emphatic "s" sound'
  },
  {
    position: 15,
    arabicChar: 'ض',
    name: 'Daad',
    nameUrdu: 'ضاد',
    soundHint: 'Emphatic "d" sound'
  },
  {
    position: 16,
    arabicChar: 'ط',
    name: 'Taa (emphatic)',
    nameUrdu: 'طاء',
    soundHint: 'Emphatic "t" sound'
  },
  {
    position: 17,
    arabicChar: 'ظ',
    name: 'Zaa (emphatic)',
    nameUrdu: 'ظاء',
    soundHint: 'Emphatic "z" sound'
  },
  {
    position: 18,
    arabicChar: 'ع',
    name: 'Ain',
    nameUrdu: 'عين',
    soundHint: 'Guttural throat sound (no English equivalent)'
  },
  {
    position: 19,
    arabicChar: 'غ',
    name: 'Ghain',
    nameUrdu: 'غين',
    soundHint: 'Guttural "gh" from throat'
  },
  {
    position: 20,
    arabicChar: 'ف',
    name: 'Faa',
    nameUrdu: 'فاء',
    soundHint: '"f" sound like in "food"'
  },
  {
    position: 21,
    arabicChar: 'ق',
    name: 'Qaaf',
    nameUrdu: 'قاف',
    soundHint: 'Deep "q" from throat'
  },
  {
    position: 22,
    arabicChar: 'ك',
    name: 'Kaaf',
    nameUrdu: 'كاف',
    soundHint: '"k" sound like in "kite"'
  },
  {
    position: 23,
    arabicChar: 'ل',
    name: 'Lam',
    nameUrdu: 'لام',
    soundHint: '"l" sound like in "lion"'
  },
  {
    position: 24,
    arabicChar: 'م',
    name: 'Meem',
    nameUrdu: 'ميم',
    soundHint: '"m" sound like in "moon"'
  },
  {
    position: 25,
    arabicChar: 'ن',
    name: 'Noon',
    nameUrdu: 'نون',
    soundHint: '"n" sound like in "nut"'
  },
  {
    position: 26,
    arabicChar: 'ه',
    name: 'Haa',
    nameUrdu: 'هاء',
    soundHint: '"h" sound like in "hello"'
  },
  {
    position: 27,
    arabicChar: 'و',
    name: 'Waaw',
    nameUrdu: 'واو',
    soundHint: '"w" sound like in "water" or "oo" like in "boot"'
  },
  {
    position: 28,
    arabicChar: 'ي',
    name: 'Yaa',
    nameUrdu: 'ياء',
    soundHint: '"y" sound like in "yes" or "ee" like in "tree"'
  },
  {
    position: 29,
    arabicChar: 'ء',
    name: 'Hamza',
    nameUrdu: 'همزة',
    soundHint: 'Glottal stop (pause/catch in throat)'
  }
];

export function getLetterByPosition(position: number): ArabicLetter | undefined {
  return ArabicLetters.find((l) => l.position === position);
}

export function getTotalLetters(): number {
  return ArabicLetters.length;
}
