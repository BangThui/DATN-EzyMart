/**
 * Tiện ích dùng chung cho ứng dụng
 */

/**
 * Format số thành định dạng tiền tệ Việt Nam (VND)
 * @param {number|string} amount - Số tiền cần format
 * @returns {string} - Chuỗi đã format kèm đơn vị 'đ'
 */
export const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
};
