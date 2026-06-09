// Authentic narrations and Qur'an verses on the virtue of the Qur'an and
// memorising it. Hadith are restricted to those in Bukhari / Muslim, or
// graded sahih/hasan sahih by their respective collectors and verified by
// later scholars (al-Albani, al-Arna'ut, etc.). Each entry carries its full
// reference and grade.

export interface QuranQuote {
  type: 'verse' | 'hadith'
  arabic: string
  english: string
  reference: string
  grade?: string
}

export const QURAN_QUOTES: QuranQuote[] = [
  // ── Qur'an ──────────────────────────────────────────────────────────────
  {
    type: 'verse',
    arabic: 'وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ',
    english:
      'And We have certainly made the Qur’an easy for remembrance, so is there any who will remember?',
    reference: 'Qur’an 54:17',
  },
  {
    type: 'verse',
    arabic: 'إِنَّا نَحْنُ نَزَّلْنَا ٱلذِّكْرَ وَإِنَّا لَهُۥ لَحَـٰفِظُونَ',
    english:
      'Indeed, it is We who sent down the Qur’an and indeed, We will be its guardian.',
    reference: 'Qur’an 15:9',
  },
  {
    type: 'verse',
    arabic:
      'كِتَـٰبٌ أَنزَلْنَـٰهُ إِلَيْكَ مُبَـٰرَكٌ لِّيَدَّبَّرُوٓا۟ ءَايَـٰتِهِۦ وَلِيَتَذَكَّرَ أُو۟لُوا۟ ٱلْأَلْبَـٰبِ',
    english:
      '[This is] a blessed Book which We have revealed to you, that they might reflect upon its verses and that those of understanding would be reminded.',
    reference: 'Qur’an 38:29',
  },
  {
    type: 'verse',
    arabic:
      'إِنَّ ٱلَّذِينَ يَتْلُونَ كِتَـٰبَ ٱللَّهِ وَأَقَامُوا۟ ٱلصَّلَوٰةَ وَأَنفَقُوا۟ مِمَّا رَزَقْنَـٰهُمْ سِرًّۭا وَعَلَانِيَةً يَرْجُونَ تِجَـٰرَةًۭ لَّن تَبُورَ',
    english:
      'Indeed, those who recite the Book of Allah, establish prayer, and spend [in His cause] out of what We have provided them, secretly and publicly, can expect a profit that will never perish.',
    reference: 'Qur’an 35:29',
  },
  {
    type: 'verse',
    arabic:
      'وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا',
    english: 'And recite the Qur’an with measured recitation.',
    reference: 'Qur’an 73:4',
  },
  {
    type: 'verse',
    arabic:
      'أَفَلَا يَتَدَبَّرُونَ ٱلْقُرْءَانَ ۚ وَلَوْ كَانَ مِنْ عِندِ غَيْرِ ٱللَّهِ لَوَجَدُوا۟ فِيهِ ٱخْتِلَـٰفًۭا كَثِيرًا',
    english:
      'Do they not reflect upon the Qur’an? Had it been from any other than Allah, they would have found in it much contradiction.',
    reference: 'Qur’an 4:82',
  },
  {
    type: 'verse',
    arabic:
      'يَـٰٓأَيُّهَا ٱلنَّاسُ قَدْ جَآءَتْكُم مَّوْعِظَةٌۭ مِّن رَّبِّكُمْ وَشِفَآءٌۭ لِّمَا فِى ٱلصُّدُورِ وَهُدًۭى وَرَحْمَةٌۭ لِّلْمُؤْمِنِينَ',
    english:
      'O mankind, there has come to you instruction from your Lord and healing for what is in the breasts, and guidance and mercy for the believers.',
    reference: 'Qur’an 10:57',
  },

  // ── Hadith ──────────────────────────────────────────────────────────────
  {
    type: 'hadith',
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    english: 'The best of you are those who learn the Qur’an and teach it.',
    reference: 'Sahih al-Bukhari 5027',
    grade: 'Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ، وَالَّذِي يَقْرَأُ الْقُرْآنَ وَيَتَتَعْتَعُ فِيهِ وَهُوَ عَلَيْهِ شَاقٌّ لَهُ أَجْرَانِ',
    english:
      'The one who is proficient with the Qur’an will be with the noble and righteous scribes (the angels). And the one who recites the Qur’an, stumbling over it, finding it difficult — they will have two rewards.',
    reference: 'Sahih al-Bukhari 4937 · Sahih Muslim 798',
    grade: 'Sahih (Mutaffaq ʿalayh)',
  },
  {
    type: 'hadith',
    arabic:
      'تَعَاهَدُوا الْقُرْآنَ، فَوَالَّذِي نَفْسِي بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا',
    english:
      'Keep refreshing your knowledge of the Qur’an, for by Him in whose hand my soul is, it slips away faster than camels released from their tethers.',
    reference: 'Sahih al-Bukhari 5033 · Sahih Muslim 791',
    grade: 'Sahih (Mutaffaq ʿalayh)',
  },
  {
    type: 'hadith',
    arabic:
      'يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا',
    english:
      'It will be said to the companion of the Qur’an: "Recite and ascend, and recite as you used to recite in the world. For your station is at the last verse you recite."',
    reference: 'Jamiʿ at-Tirmidhi 2914 · Sunan Abi Dawud 1464',
    grade: 'Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا، لَا أَقُولُ الٓمٓ حَرْفٌ، وَلَكِنْ أَلِفٌ حَرْفٌ، وَلَامٌ حَرْفٌ، وَمِيمٌ حَرْفٌ',
    english:
      'Whoever recites a single letter from the Book of Allah will have a reward, and that reward will be multiplied by ten. I do not say that Alif-Lam-Mim is one letter — rather Alif is a letter, Lam is a letter, and Mim is a letter.',
    reference: 'Jamiʿ at-Tirmidhi 2910',
    grade: 'Hasan Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'إِنَّ الَّذِي لَيْسَ فِي جَوْفِهِ شَيْءٌ مِنَ الْقُرْآنِ كَالْبَيْتِ الْخَرِبِ',
    english:
      'Verily, the one who has nothing of the Qur’an inside him is like a ruined house.',
    reference: 'Jamiʿ at-Tirmidhi 2913',
    grade: 'Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ',
    english:
      'Recite the Qur’an, for it will come on the Day of Resurrection as an intercessor for its companions.',
    reference: 'Sahih Muslim 804',
    grade: 'Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللَّهُ الْقُرْآنَ فَهُوَ يَقُومُ بِهِ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ، وَرَجُلٌ آتَاهُ اللَّهُ مَالًا فَهُوَ يُنْفِقُ مِنْهُ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ',
    english:
      'There is no envy except in two cases: a man whom Allah has given the Qur’an and he stands [reciting] it night and day, and a man whom Allah has given wealth which he spends night and day.',
    reference: 'Sahih al-Bukhari 5025 · Sahih Muslim 815',
    grade: 'Sahih (Mutaffaq ʿalayh)',
  },
  {
    type: 'hadith',
    arabic:
      'مَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ، يَتْلُونَ كِتَابَ اللَّهِ، وَيَتَدَارَسُونَهُ بَيْنَهُمْ، إِلَّا نَزَلَتْ عَلَيْهِمُ السَّكِينَةُ، وَغَشِيَتْهُمُ الرَّحْمَةُ، وَحَفَّتْهُمُ الْمَلَائِكَةُ، وَذَكَرَهُمُ اللَّهُ فِيمَنْ عِنْدَهُ',
    english:
      'No people gather in one of the houses of Allah, reciting the Book of Allah and studying it among themselves, except that tranquillity descends upon them, mercy covers them, the angels surround them, and Allah mentions them among those who are with Him.',
    reference: 'Sahih Muslim 2699',
    grade: 'Sahih',
  },
  {
    type: 'hadith',
    arabic:
      'مَنْ قَرَأَ الْقُرْآنَ، وَتَعَلَّمَ، وَعَمِلَ بِهِ، أُلْبِسَ وَالِدَاهُ يَوْمَ الْقِيَامَةِ تَاجًا مِنْ نُورٍ ضَوْءُهُ مِثْلُ ضَوْءِ الشَّمْسِ',
    english:
      'Whoever recites the Qur’an, learns it, and acts upon it, his parents will be crowned on the Day of Resurrection with a crown of light whose brightness is like the light of the sun.',
    reference: 'Sunan Abi Dawud 1453 · Musnad Ahmad 15605',
    grade: 'Hasan',
  },
]
