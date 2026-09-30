/**
 * Standard GSM 7-bit alphabet character set
 */
const GSM_7BIT_CHARS = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
);

/**
 * Extended GSM 7-bit characters (counts as 2 characters in GSM-7)
 */
const GSM_7BIT_EXT_CHARS = new Set('^{}\\[~]|€');

export interface SmsCountResult {
  charCount: number;
  segmentCount: number;
  maxCharsCurrentSegment: number;
  remainingInSegment: number;
  isUnicode: boolean;
  encoding: 'GSM-7' | 'UCS-2';
}

export function calculateSmsSegments(text: string): SmsCountResult {
  if (!text || text.length === 0) {
    return {
      charCount: 0,
      segmentCount: 0,
      maxCharsCurrentSegment: 160,
      remainingInSegment: 160,
      isUnicode: false,
      encoding: 'GSM-7',
    };
  }

  let isUnicode = false;
  let gsmLength = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (GSM_7BIT_EXT_CHARS.has(char)) {
      gsmLength += 2;
    } else if (GSM_7BIT_CHARS.has(char)) {
      gsmLength += 1;
    } else {
      isUnicode = true;
      break;
    }
  }

  if (isUnicode) {
    const charCount = text.length;
    let segmentCount = 1;
    let maxLimit = 70;

    if (charCount <= 70) {
      segmentCount = 1;
      maxLimit = 70;
    } else {
      segmentCount = Math.ceil(charCount / 67);
      maxLimit = segmentCount * 67;
    }

    return {
      charCount,
      segmentCount,
      maxCharsCurrentSegment: segmentCount === 1 ? 70 : 67,
      remainingInSegment: maxLimit - charCount,
      isUnicode: true,
      encoding: 'UCS-2',
    };
  }

  // GSM 7-bit calculation
  const charCount = gsmLength;
  let segmentCount = 1;
  let maxLimit = 160;

  if (charCount <= 160) {
    segmentCount = 1;
    maxLimit = 160;
  } else {
    segmentCount = Math.ceil(charCount / 153);
    maxLimit = segmentCount * 153;
  }

  return {
    charCount,
    segmentCount,
    maxCharsCurrentSegment: segmentCount === 1 ? 160 : 153,
    remainingInSegment: maxLimit - charCount,
    isUnicode: false,
    encoding: 'GSM-7',
  };
}
