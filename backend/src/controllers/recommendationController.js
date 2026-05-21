const db = require('../config/db');

const getDailyCombo = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        // Tạo seed cố định trong 24h dựa vào định dạng YYYYMMDD
        const seed = parseInt(`${year}${month}${day}`, 10);
        
        const hour = now.getHours();
        
        let comboName = '';
        let items = [];
        
        if (hour >= 5 && hour < 11) {
            // Khung giờ Bữa sáng (5h - 10h59)
            comboName = 'Combo Bữa sáng tiện lợi';
            const [food] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.category_id IN (74,98,101) AND p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 GROUP BY p.product_id ORDER BY RAND(?) LIMIT 1`, 
                [seed]
            );
            const [drink] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.category_id IN (3,69,82,83) AND p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 GROUP BY p.product_id ORDER BY RAND(?) LIMIT 1`, 
                [seed]
            );
            
            if (food.length > 0) items.push(food[0]);
            if (drink.length > 0) items.push(drink[0]);
            
        } else if (hour >= 11 && hour < 15) {
            // Khung giờ Bữa trưa (11h - 14h59)
            comboName = 'Combo Bữa trưa nhanh chóng';
            // Nhóm Thực phẩm chế biến/Bánh kẹo (73, 79, 108)
            const [food] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.category_id IN (73,79,108) AND p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 GROUP BY p.product_id ORDER BY RAND(?) LIMIT 1`, 
                [seed]
            );
            const [drink] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.category_id IN (69,83) AND p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 GROUP BY p.product_id ORDER BY RAND(?) LIMIT 1`, 
                [seed]
            );
            
            if (food.length > 0) items.push(food[0]);
            if (drink.length > 0) items.push(drink[0]);
            
        } else {
            // Các khung giờ còn lại
            comboName = 'Gợi ý mua sắm hot trong ngày';
            // Lấy ngẫu nhiên các sản phẩm hot
            const [hotProducts] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.product_hot = 1 AND p.product_active = 1 AND p.is_deleted = 0 
                 GROUP BY p.product_id ORDER BY RAND(?) LIMIT 4`, 
                [seed]
            );
            items = hotProducts;
        }

        return res.json({
            success: true,
            comboName,
            items
        });

    } catch (error) {
        console.error('Lỗi API recommendations/combo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy gợi ý' });
    }
};

module.exports = {
    getDailyCombo
};
