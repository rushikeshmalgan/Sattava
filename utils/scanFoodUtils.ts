export const BREAD_LIKE_REGEX = /(chapati|roti|phulka|paratha|naan|kulcha)/i;

export const isBreadLikeItem = (label: string): boolean => {
  return BREAD_LIKE_REGEX.test(label);
};
