/**
 * Helper to resolve image URL
 * Handles both absolute URLs (Cloudinary) and local fallbacks
 */
export const getImageUrl = imagePath => {
  if (!imagePath) return "/placeholder.png";

  // Trường hợp 1: Ảnh từ Cloudinary (đã migration hoặc up mới)
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Trường hợp 2: Nếu vẫn còn tên file cũ mà không tìm thấy trên Cloudinary
  return "/placeholder.png";
};
