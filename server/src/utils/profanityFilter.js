const arabicProfanity = [
  'كلب', 'حمار', 'غبي', 'أحمق'
];

const frenchProfanity = [
  'merde', 'con', 'idiot', 'stupide'
];

const allProfanity = [...arabicProfanity, ...frenchProfanity];

export const containsProfanity = (text) => {
  const lowerText = text.toLowerCase();
  return allProfanity.some(word => lowerText.includes(word.toLowerCase()));
};

export const maskProfanity = (text) => {
  let maskedText = text;
  allProfanity.forEach(word => {
    const regex = new RegExp(word, 'gi');
    maskedText = maskedText.replace(regex, '*'.repeat(word.length));
  });
  return maskedText;
};
