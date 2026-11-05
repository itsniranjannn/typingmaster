import { countWords } from "./nepaliText";

/**
 * Loksewa-style passages: formal, administrative Nepali like the paragraphs used in
 * government typing tests. The real Public Service Commission passages are set per
 * vacancy notice; these are original practice passages in the same register.
 */
export const LOKSEWA_PASSAGES = [
  "नेपाल सरकारले सार्वजनिक सेवालाई छिटो, छरितो र पारदर्शी बनाउन विभिन्न कदम चालेको छ। सबै कार्यालयले नागरिकलाई सेवा प्रदान गर्दा समयमै काम सम्पादन गर्नुपर्ने व्यवस्था गरिएको छ।",
  "लोक सेवा आयोगले योग्यता र क्षमताका आधारमा निष्पक्ष रूपमा कर्मचारी छनोट गर्ने काम गर्दछ। उम्मेदवारहरूले निर्धारित समयभित्र आवेदन फारम भरेर बुझाउनुपर्नेछ।",
  "कार्यालयका सबै कर्मचारीले आफ्नो जिम्मेवारी इमानदारीपूर्वक निर्वाह गर्नुपर्छ। कुनै पनि निर्णय गर्नुअघि सम्बन्धित कागजात राम्ररी अध्ययन गरिनुपर्दछ।",
  "सूचना प्रविधिको विकासले सरकारी कामकाजमा ठूलो परिवर्तन ल्याएको छ। अब धेरै सेवाहरू अनलाइन माध्यमबाट उपलब्ध गराइन्छन्।",
  "प्रत्येक नागरिकलाई शिक्षा, स्वास्थ्य र रोजगारीको अवसर उपलब्ध गराउनु राज्यको प्रमुख दायित्व हो। यस कार्यका लागि सबै तहका सरकारले समन्वय गर्नुपर्दछ।",
  "बजेट तर्जुमा गर्दा आर्थिक अनुशासन कायम राख्न तथा स्रोतको अधिकतम सदुपयोग गर्न विशेष ध्यान दिनुपर्छ। खर्चको विवरण नियमित रूपमा अभिलेख गरिनुपर्दछ।",
  "संघीय संरचनामा स्थानीय सरकारले जनताको सबैभन्दा नजिकबाट सेवा प्रदान गर्दछ। वडा कार्यालयबाट सिफारिस, प्रमाणपत्र र दर्ता सम्बन्धी काम गरिन्छ।",
  "वातावरण संरक्षण हामी सबैको साझा जिम्मेवारी हो। वन, जलस्रोत र जैविक विविधताको सन्तुलित उपयोग गरी भावी पुस्तालाई सुरक्षित वातावरण हस्तान्तरण गर्नुपर्छ।",
  "टाइपिङ परीक्षामा शुद्धता र गति दुवैलाई समान महत्त्व दिइन्छ। परीक्षार्थीले दिइएको अनुच्छेद ध्यानपूर्वक हेरेर कुनै शब्द नछुटाई टाइप गर्नुपर्छ।",
  "सार्वजनिक खरिद प्रक्रियामा प्रतिस्पर्धा, पारदर्शिता र जवाफदेहिता कायम गर्नु अनिवार्य छ। बोलपत्र सम्बन्धी सूचना राष्ट्रिय दैनिक पत्रिकामा प्रकाशन गरिन्छ।",
  "सुशासन कायम गर्न भ्रष्टाचार नियन्त्रण, कानुनको शासन र जनसहभागिता आवश्यक हुन्छ। सरकारी निकायले आफ्ना निर्णय र कामको जानकारी जनतालाई समयमै उपलब्ध गराउनुपर्दछ।",
  "कृषि नेपालको अर्थतन्त्रको मेरुदण्ड हो। किसानहरूलाई उन्नत बीउ, मल र सिँचाइको सुविधा उपलब्ध गराएमा उत्पादन बढ्ने र गरिबी घट्ने अपेक्षा गरिन्छ।"
];

const shuffled = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** A test sheet: whole passages until there are at least `minWords` words. */
export const getLoksewaPassage = (minWords = 90) => {
  const parts = [];
  let total = 0;
  for (const passage of shuffled(LOKSEWA_PASSAGES)) {
    parts.push(passage);
    total += countWords(passage);
    if (total >= minWords) break;
  }
  return parts.join(" ");
};

/** More text appended while the clock is still running. */
export const getLoksewaChunk = () => getLoksewaPassage(30);

/** Loksewa-style presets. Real parameters differ per vacancy notice. */
export const LOKSEWA_DURATIONS = [
  { seconds: 300, label: "5 min" },
  { seconds: 600, label: "10 min" }
];
export const LOKSEWA_TARGETS = [20, 25, 30, 35];
export const LOKSEWA_MIN_ACCURACY = 95;

/**
 * Net WPM = correct characters / 5 / minutes. Wrong characters earn nothing, so
 * errors lower the score on their own. Passing needs the target speed AND accuracy.
 */
export const evaluateLoksewa = ({ wpm, accuracy, targetWpm, minAccuracy = LOKSEWA_MIN_ACCURACY }) => ({
  targetWpm,
  minAccuracy,
  netWpm: wpm,
  accuracy,
  speedOk: wpm >= targetWpm,
  accuracyOk: accuracy >= minAccuracy,
  passed: wpm >= targetWpm && accuracy >= minAccuracy
});
