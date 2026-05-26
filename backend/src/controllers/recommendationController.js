const db = require('../config/db');

// Hàm helper để lấy các biến thể của sản phẩm
const getVariantsForProduct = async (productId) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM product_variants WHERE product_id = ?`,
            [productId]
        );
        return rows;
    } catch (error) {
        console.error(`Lỗi khi lấy biến thể cho sản phẩm ${productId}:`, error);
        return [];
    }
};

// Hàm helper để lấy 1 sản phẩm ngẫu nhiên thuộc danh mục chỉ định, tránh trùng lặp. Có fallback nếu danh mục trống.
const getRandomProductByCategory = async (categoryIds, excludeIds = [], fallbackCategoryIds = []) => {
    try {
        const excludeCondition = excludeIds.length > 0 ? `AND p.product_id NOT IN (${excludeIds.join(',')})` : '';
        
        // Bước 1: Thử truy vấn danh mục chính
        let [rows] = await db.query(
            `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
             FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
             WHERE p.category_id IN (${categoryIds.join(',')}) AND p.product_active = 1 AND p.is_deleted = 0 
             AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
             ${excludeCondition}
             GROUP BY p.product_id ORDER BY RAND() LIMIT 1`
        );
        
        // Bước 2: Nếu danh mục chính trống, thử truy vấn danh mục fallback (nếu có)
        if (rows.length === 0 && fallbackCategoryIds && fallbackCategoryIds.length > 0) {
            [rows] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.category_id IN (${fallbackCategoryIds.join(',')}) AND p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 ${excludeCondition}
                 GROUP BY p.product_id ORDER BY RAND() LIMIT 1`
            );
        }
        
        // Bước 3: Nếu vẫn trống, lấy bất kỳ sản phẩm nào đang bán (tránh giao diện bị thiếu card)
        if (rows.length === 0) {
            [rows] = await db.query(
                `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price 
                 FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id 
                 WHERE p.product_active = 1 AND p.is_deleted = 0 
                 AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
                 ${excludeCondition}
                 GROUP BY p.product_id ORDER BY RAND() LIMIT 1`
            );
        }
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error(`Lỗi khi lấy sản phẩm ngẫu nhiên cho danh mục ${categoryIds}:`, error);
        return null;
    }
};

const getDailyCombo = async (req, res) => {
    try {
        let hour = new Date().getHours();
        
        // Hỗ trợ tham số query ?hour để phục vụ việc test
        if (req.query.hour !== undefined) {
            const parsedHour = parseInt(req.query.hour, 10);
            if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
                hour = parsedHour;
            }
        }
        
        let title = '';
        let combos = [];
        
        if (hour >= 6 && hour < 11) {
            // Khung giờ Sáng (6h - 11h)
            title = '🌅 Năng lượng buổi sáng';
            
            // Combo 1: Bữa sáng tiện lợi -> Lấy 5 món distinct
            const exclude1 = [];
            const item1_1 = await getRandomProductByCategory([125, 126, 130], exclude1, [90, 95]);
            if (item1_1) exclude1.push(item1_1.product_id);
            const item1_2 = await getRandomProductByCategory([125, 126, 130], exclude1, [90, 95]);
            if (item1_2) exclude1.push(item1_2.product_id);
            const item1_3 = await getRandomProductByCategory([107, 109], exclude1, [3, 69, 83]);
            if (item1_3) exclude1.push(item1_3.product_id);
            const item1_4 = await getRandomProductByCategory([107, 109], exclude1, [3, 69, 83]);
            if (item1_4) exclude1.push(item1_4.product_id);
            const item1_5 = await getRandomProductByCategory([90], exclude1, [73, 124]);
            
            // Combo 2: Sáng ấm bụng -> Lấy 5 món distinct
            const exclude2 = [];
            const item2_1 = await getRandomProductByCategory([98, 101], exclude2, [79, 108]);
            if (item2_1) exclude2.push(item2_1.product_id);
            const item2_2 = await getRandomProductByCategory([98, 101], exclude2, [79, 108]);
            if (item2_2) exclude2.push(item2_2.product_id);
            const item2_3 = await getRandomProductByCategory([82, 69, 83], exclude2, [83]);
            if (item2_3) exclude2.push(item2_3.product_id);
            const item2_4 = await getRandomProductByCategory([82, 69, 83], exclude2, [83]);
            if (item2_4) exclude2.push(item2_4.product_id);
            const item2_5 = await getRandomProductByCategory([108], exclude2, [74, 98]);
            
            // Combo 3: Healthy Sáng -> Lấy 5 món distinct
            const exclude3 = [];
            const item3_1 = await getRandomProductByCategory([103], exclude3, [73, 124]);
            if (item3_1) exclude3.push(item3_1.product_id);
            const item3_2 = await getRandomProductByCategory([103], exclude3, [73, 124]);
            if (item3_2) exclude3.push(item3_2.product_id);
            const item3_3 = await getRandomProductByCategory([90], exclude3, [130]);
            if (item3_3) exclude3.push(item3_3.product_id);
            const item3_4 = await getRandomProductByCategory([90], exclude3, [130]);
            if (item3_4) exclude3.push(item3_4.product_id);
            const item3_5 = await getRandomProductByCategory([130], exclude3, [90]);
            
            combos = [
                {
                    id_combo: 'C1',
                    comboName: 'Bữa sáng tiện lợi',
                    items: [item1_1, item1_2, item1_3, item1_4, item1_5].filter(Boolean)
                },
                {
                    id_combo: 'C2',
                    comboName: 'Sáng ấm bụng',
                    items: [item2_1, item2_2, item2_3, item2_4, item2_5].filter(Boolean)
                },
                {
                    id_combo: 'C3',
                    comboName: 'Healthy Sáng',
                    items: [item3_1, item3_2, item3_3, item3_4, item3_5].filter(Boolean)
                }
            ];
            
        } else if (hour >= 11 && hour < 16) {
            // Khung giờ Trưa (11h - 16h)
            title = '☀️ Gợi ý combo ăn trưa & giải nhiệt';
            
            // Combo 1: Cơm trưa nhanh gọn -> Lấy 5 món distinct
            const exclude1 = [];
            const item1_1 = await getRandomProductByCategory([98, 101, 104], exclude1, [74, 98]);
            if (item1_1) exclude1.push(item1_1.product_id);
            const item1_2 = await getRandomProductByCategory([98, 101, 104], exclude1, [74, 98]);
            if (item1_2) exclude1.push(item1_2.product_id);
            const item1_3 = await getRandomProductByCategory([98, 101, 104], exclude1, [74, 98]);
            if (item1_3) exclude1.push(item1_3.product_id);
            const item1_4 = await getRandomProductByCategory([83], exclude1, [3, 69]);
            if (item1_4) exclude1.push(item1_4.product_id);
            const item1_5 = await getRandomProductByCategory([83], exclude1, [3, 69]);
            
            // Combo 2: Giải nhiệt thanh mát -> Lấy 5 món distinct
            const exclude2 = [];
            const item2_1 = await getRandomProductByCategory([90], exclude2, [95, 96]);
            if (item2_1) exclude2.push(item2_1.product_id);
            const item2_2 = await getRandomProductByCategory([90], exclude2, [95, 96]);
            if (item2_2) exclude2.push(item2_2.product_id);
            const item2_3 = await getRandomProductByCategory([90], exclude2, [95, 96]);
            if (item2_3) exclude2.push(item2_3.product_id);
            const item2_4 = await getRandomProductByCategory([130], exclude2, [93, 107]);
            if (item2_4) exclude2.push(item2_4.product_id);
            const item2_5 = await getRandomProductByCategory([130], exclude2, [93, 107]);
            
            // Combo 3: Nạp đường xế chiều -> Lấy 5 món distinct
            const exclude3 = [];
            const item3_1 = await getRandomProductByCategory([93, 94, 95], exclude3, [90]);
            if (item3_1) exclude3.push(item3_1.product_id);
            const item3_2 = await getRandomProductByCategory([93, 94, 95], exclude3, [90]);
            if (item3_2) exclude3.push(item3_2.product_id);
            const item3_3 = await getRandomProductByCategory([93, 94, 95], exclude3, [90]);
            if (item3_3) exclude3.push(item3_3.product_id);
            const item3_4 = await getRandomProductByCategory([69], exclude3, [3, 82]);
            if (item3_4) exclude3.push(item3_4.product_id);
            const item3_5 = await getRandomProductByCategory([69], exclude3, [3, 82]);
            
            combos = [
                {
                    id_combo: 'C1',
                    comboName: 'Cơm trưa nhanh gọn',
                    items: [item1_1, item1_2, item1_3, item1_4, item1_5].filter(Boolean)
                },
                {
                    id_combo: 'C2',
                    comboName: 'Giải nhiệt thanh mát',
                    items: [item2_1, item2_2, item2_3, item2_4, item2_5].filter(Boolean)
                },
                {
                    id_combo: 'C3',
                    comboName: 'Nạp đường xế chiều',
                    items: [item3_1, item3_2, item3_3, item3_4, item3_5].filter(Boolean)
                }
            ];
            
        } else {
            // Khung giờ Chiều/Tối/Đêm (16h - trước 6h sáng hôm sau)
            title = '🌙 Combo buổi tối & Ăn đêm';
            
            // Combo 1: Nấu cơm gia đình -> Lấy 5 món distinct
            const exclude1 = [];
            const item1_1 = await getRandomProductByCategory([112, 113, 115, 117], exclude1, [79]);
            if (item1_1) exclude1.push(item1_1.product_id);
            const item1_2 = await getRandomProductByCategory([112, 113, 115, 117], exclude1, [79]);
            if (item1_2) exclude1.push(item1_2.product_id);
            const item1_3 = await getRandomProductByCategory([91, 92], exclude1, [108]);
            if (item1_3) exclude1.push(item1_3.product_id);
            const item1_4 = await getRandomProductByCategory([91, 92], exclude1, [108]);
            if (item1_4) exclude1.push(item1_4.product_id);
            const item1_5 = await getRandomProductByCategory([88, 89], exclude1, [90]);
            
            // Combo 2: Cú đêm ăn liền -> Lấy 5 món distinct
            const exclude2 = [];
            const item2_1 = await getRandomProductByCategory([98, 100], exclude2, [79]);
            if (item2_1) exclude2.push(item2_1.product_id);
            const item2_2 = await getRandomProductByCategory([98, 100], exclude2, [79]);
            if (item2_2) exclude2.push(item2_2.product_id);
            const item2_3 = await getRandomProductByCategory([108], exclude2, [95]);
            if (item2_3) exclude2.push(item2_3.product_id);
            const item2_4 = await getRandomProductByCategory([108], exclude2, [95]);
            if (item2_4) exclude2.push(item2_4.product_id);
            const item2_5 = await getRandomProductByCategory([69], exclude2, [83]);
            
            // Combo 3: Trái cây tráng miệng & Đồ nhắm -> Lấy 5 món distinct
            const exclude3 = [];
            const item3_1 = await getRandomProductByCategory([90], exclude3, [95]);
            if (item3_1) exclude3.push(item3_1.product_id);
            const item3_2 = await getRandomProductByCategory([118], exclude3, [3, 69, 82]);
            if (item3_2) exclude3.push(item3_2.product_id);
            const item3_3 = await getRandomProductByCategory([118], exclude3, [3, 69, 82]);
            if (item3_3) exclude3.push(item3_3.product_id);
            const item3_4 = await getRandomProductByCategory([96], exclude3, [90]);
            if (item3_4) exclude3.push(item3_4.product_id);
            const item3_5 = await getRandomProductByCategory([96], exclude3, [90]);
            
            combos = [
                {
                    id_combo: 'C1',
                    comboName: 'Nấu cơm gia đình',
                    items: [item1_1, item1_2, item1_3, item1_4, item1_5].filter(Boolean)
                },
                {
                    id_combo: 'C2',
                    comboName: 'Cú đêm ăn liền',
                    items: [item2_1, item2_2, item2_3, item2_4, item2_5].filter(Boolean)
                },
                {
                    id_combo: 'C3',
                    comboName: 'Trái cây tráng miệng & Đồ nhắm',
                    items: [item3_1, item3_2, item3_3, item3_4, item3_5].filter(Boolean)
                }
            ];
        }
        
        // Bổ sung mảng variants cho từng sản phẩm để Frontend dùng ProductCard
        for (const combo of combos) {
            for (const item of combo.items) {
                if (item) {
                    item.variants = await getVariantsForProduct(item.product_id);
                }
            }
        }
        
        return res.json({
            success: true,
            title,
            combos
        });
        
    } catch (error) {
        console.error('Lỗi API recommendations/combo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy gợi ý' });
    }
};

module.exports = {
    getDailyCombo
};
