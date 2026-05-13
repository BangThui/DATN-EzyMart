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
 * Chuyển đổi danh sách danh mục phẳng sang cấu trúc cây
 * @param {Array} categories - Danh sách danh mục phẳng
 * @param {number|null} parentId - ID cha hiện tại (để đệ quy)
 * @returns {Array} - Cấu trúc cây
 */
export const buildCategoryTree = (categories, parentId = null) => {
    if (!Array.isArray(categories)) return [];
    
    return categories
        .filter(c => c.parent_id === parentId)
        .map(c => ({
            ...c,
            key: c.category_id,
            label: c.category_name,
            children: buildCategoryTree(categories, c.category_id).length > 0 
                ? buildCategoryTree(categories, c.category_id) 
                : null
        }));
};

/**
 * Tạo cấu trúc items cho Ant Design Menu từ danh mục cây
 * @param {Array} tree - Mảng danh mục đã được build thành cây
 * @param {Function} onClick - Hàm xử lý khi click vào item
 * @returns {Array} - Items cho Menu
 */
export const buildMenuItems = (tree, onClick) => {
    return tree.map(item => {
        const result = {
            key: item.category_id,
            label: React.createElement('span', {
                onClick: (e) => {
                    e.stopPropagation();
                    onClick(item.category_id);
                },
                style: { display: 'block', width: '100%' }
            }, item.category_name),
        };
        
        if (item.children && item.children.length > 0) {
            result.children = buildMenuItems(item.children, onClick);
        }
        
        return result;
    });
};
