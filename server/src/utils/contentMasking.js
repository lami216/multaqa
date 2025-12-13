export const maskPhoneNumbers = (text) => {
  const phoneRegex = /(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}/g;
  return text.replace(phoneRegex, '[Phone Number Hidden]');
};

export const maskEmails = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.replace(emailRegex, '[Email Hidden]');
};

export const maskContactInfo = (text) => {
  let maskedText = maskPhoneNumbers(text);
  maskedText = maskEmails(maskedText);
  return maskedText;
};
