"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimToWords = void 0;
const trimToWords = (text, numWords, ellipsis = '...') => {
    const words = text.split(/\s+/);
    const trimmedWords = words.slice(0, numWords);
    const trimmedText = trimmedWords.join(' ');
    if (words.length > numWords) {
        return trimmedText.trim() + ellipsis;
    }
    else {
        return trimmedText.trim();
    }
};
exports.trimToWords = trimToWords;
