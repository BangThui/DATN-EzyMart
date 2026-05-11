/**
 * Helper to resolve image URL
 * Handles both absolute URLs (Cloudinary) and relative filenames (local storage)
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  
  // If it's already a full URL (starts with http), return as is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  
  // Otherwise, assume it's a local upload and prefix with backend upload path
  const UPLOAD_BASE = "http://localhost:5000/uploads/";
  return `${UPLOAD_BASE}${imagePath}`;
};
