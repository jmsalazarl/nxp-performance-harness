/**
 * Classifies test type based on filename keywords.
 * 
 * Searches for test type keywords in the filename (case-insensitive):
 * - loadtest
 * - stresstest
 * - capacitytest
 * - stabilitytest
 * 
 * Returns the corresponding test type if exactly one keyword is found.
 * Returns "unknown" if no keywords or multiple keywords are found.
 * 
 * @param fileName - The filename to classify
 * @returns The detected test type or "unknown"
 */

export type TestType = "loadtest" | "stresstest" | "capacitytest" | "stabilitytest" | "unknown";

const KEYWORDS: TestType[] = ["loadtest", "stresstest", "capacitytest", "stabilitytest"];

export function classifyTestType(fileName: string): TestType {
  const lowerFileName = fileName.toLowerCase();
  
  const matchedKeywords = KEYWORDS.filter(keyword => 
    lowerFileName.includes(keyword)
  );
  
  // Return the type if exactly one keyword is found
  if (matchedKeywords.length === 1) {
    return matchedKeywords[0] as TestType;
  }
  
  // Return "unknown" if no keywords or multiple keywords (ambiguity)
  return "unknown";
}
