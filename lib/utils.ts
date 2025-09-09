import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes objects for serialization by converting CID objects and other
 * problematic objects to strings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeForSerialization(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== "object") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForSerialization);
  }

  // For all objects, check if they have any problematic properties
  // that would indicate they're not plain objects
  if (
    obj.constructor?.name === "CID" ||
    obj.constructor?.name !== "Object" ||
    typeof obj.toJSON === "function" ||
    obj.code !== undefined ||
    obj.version !== undefined ||
    obj.multihash !== undefined ||
    obj.asCID !== undefined ||
    (typeof obj.toString === "function" &&
      typeof obj.toString() === "string" &&
      obj.toString().length > 10 &&
      (obj.toString().startsWith("baf") || obj.toString().startsWith("bafy")))
  ) {
    // Convert problematic objects to strings
    try {
      return String(obj);
    } catch {
      return "[Unparseable Object]";
    }
  }

  // For plain objects, recursively sanitize all properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    try {
      sanitized[key] = sanitizeForSerialization(value);
    } catch {
      // If sanitization fails for a property, convert it to string
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}
