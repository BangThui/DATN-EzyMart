import React from 'react';

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

/**
 * Chuyển đổi danh sách danh mục phẳng sang cấu trúc cây cho TreeSelect
 * @param {Array} categories - Danh sách danh mục phẳng
 * @param {Object} options - Tùy chỉnh (boldParent, leafOnly)
 * @returns {Array} - Cấu trúc cây
 */
export const buildCategoryTree = (categories, options = {}) => {
    const { boldParent = false, leafOnly = false } = options;
    if (!Array.isArray(categories)) return [];

    return categories
        .filter(c => !c.parent_id)
        .map(c => {
            const children = categories
                .filter(child => child.parent_id === c.category_id)
                .map(child => ({
                    value: child.category_id,
                    title: child.category_name,
                }));
            
            const hasChildren = children.length > 0;
            
            let title = c.category_name;
            if (boldParent && hasChildren) {
                // Sử dụng React.createElement để tránh lỗi JSX trong file .js nếu cấu hình nghiêm ngặt
                title = React.createElement('span', { style: { fontWeight: 600, color: '#262626' } }, c.category_name);
            }

            return {
                value: c.category_id,
                title: title,
                selectable: leafOnly ? !hasChildren : true,
                children: children.length > 0 ? children : undefined
            };
        });
};
