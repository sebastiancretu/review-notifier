export const trimToWords = (
  text: string,
  numWords: number,
  ellipsis = '...'
): string => {
  const words = text.split(/\s+/);
  const trimmedWords = words.slice(0, numWords);
  const trimmedText = trimmedWords.join(' ');

  if (words.length > numWords) {
    return trimmedText.trim() + ellipsis;
  } else {
    return trimmedText.trim();
  }
};
