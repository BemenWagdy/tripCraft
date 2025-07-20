// lib/costParser.ts
// Helper function to parse cost strings and return structured amounts

export interface ParsedCost {
  dest: number;
  home: number;
}

/**
 * Parse cost strings like "25 EUR (27 USD)", "150 EGP ($5 USD)", etc.
 * Returns { dest: number, home: number } - ignores "Free" / "Included"
 */
export function parseCost(str: string, destIso: string, homeIso: string): ParsedCost {
  if (!str || str === 'Free' || str === 'Included') {
    return { dest: 0, home: 0 };
  }

  // Pattern 1: "25 EUR (27 USD)" or "25 EUR ($27 USD)"
  const pattern1 = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${destIso}\\s*\\(\\$?(\\d+(?:\\.\\d+)?)\\s*${homeIso}\\)`, 'i');
  const match1 = str.match(pattern1);
  if (match1) {
    return {
      dest: parseFloat(match1[1]),
      home: parseFloat(match1[2])
    };
  }

  // Pattern 2: "150 EGP ($5 USD)" - destination first, then home in parentheses
  const pattern2 = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${destIso}\\s*\\(\\$?(\\d+(?:\\.\\d+)?)\\s*${homeIso}\\)`, 'i');
  const match2 = str.match(pattern2);
  if (match2) {
    return {
      dest: parseFloat(match2[1]),
      home: parseFloat(match2[2])
    };
  }

  // Pattern 3: "$27 USD (25 EUR)" - home first, then destination
  const pattern3 = new RegExp(`\\$?(\\d+(?:\\.\\d+)?)\\s*${homeIso}\\s*\\((\\d+(?:\\.\\d+)?)\\s*${destIso}\\)`, 'i');
  const match3 = str.match(pattern3);
  if (match3) {
    return {
      dest: parseFloat(match3[2]),
      home: parseFloat(match3[1])
    };
  }

  // Pattern 4: Just destination amount "25 EUR"
  const pattern4 = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${destIso}`, 'i');
  const match4 = str.match(pattern4);
  if (match4) {
    const destAmount = parseFloat(match4[1]);
    return {
      dest: destAmount,
      home: destAmount // Fallback if no conversion available
    };
  }

  // Pattern 5: Just home amount "$25 USD"
  const pattern5 = new RegExp(`\\$?(\\d+(?:\\.\\d+)?)\\s*${homeIso}`, 'i');
  const match5 = str.match(pattern5);
  if (match5) {
    const homeAmount = parseFloat(match5[1]);
    return {
      dest: homeAmount, // Fallback if no conversion available
      home: homeAmount
    };
  }

  // Fallback: try to extract any number
  const numberMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const amount = parseFloat(numberMatch[1]);
    return { dest: amount, home: amount };
  }

  return { dest: 0, home: 0 };
}