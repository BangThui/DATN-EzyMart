const db = require('../config/db');
const comboCache = require('../utils/comboCache');
const groqService = require('../services/GroqService');

// ─── Danh mục thực phẩm phù hợp để gợi ý (loại bỏ đồ dùng, hóa phẩm,...) ────
// Dùng chung cho cả LLM Pool Query và Fallback
const FOOD_CATEGORY_IDS = [
    69, 82, 83, 90, 91, 92, 93, 94, 95, 96,
    98, 100, 101, 103, 104, 107, 108, 109, 112, 113,
    115, 117, 118, 125, 126, 130
];

// ─── Helper: lấy đầy đủ thông tin variants cho một sản phẩm ─────────────────
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

// ─── Helper: lấy 1 sản phẩm ngẫu nhiên theo danh mục (dùng cho Fallback) ────
const getRandomProductByCategory = async (categoryIds, excludeIds = [], fallbackCategoryIds = []) => {
    try {
        const excludeCondition = excludeIds.length > 0 ? `AND p.product_id NOT IN (${excludeIds.join(',')})` : '';

        let [rows] = await db.query(
            `SELECT p.*, MIN(COALESCE(NULLIF(v.variant_discount, 0), v.variant_price)) as price
             FROM products p LEFT JOIN product_variants v ON p.product_id = v.product_id
             WHERE p.category_id IN (${categoryIds.join(',')}) AND p.product_active = 1 AND p.is_deleted = 0
             AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%' AND p.product_name NOT LIKE '%Combo%'
             ${excludeCondition}
             GROUP BY p.product_id ORDER BY RAND() LIMIT 1`
        );

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
        console.error(`Lỗi getRandomProductByCategory:`, error);
        return null;
    }
};

// ─── Fallback: sinh combo theo rule cũ khi LLM gặp sự cố ────────────────────
const generateCombosWithFallback = async (hour) => {
    let title = '';
    let combos = [];

    if (hour >= 6 && hour < 11) {
        title = '🌅 Năng lượng buổi sáng';
        const ex1 = [], ex2 = [], ex3 = [];
        const [i1_1, i1_2, i1_3, i1_4, i1_5] = await Promise.all([
            getRandomProductByCategory([125,126,130], ex1, [90,95]).then(p => { if(p) ex1.push(p.product_id); return p; }),
            getRandomProductByCategory([125,126,130], ex1, [90,95]).then(p => { if(p) ex1.push(p.product_id); return p; }),
            getRandomProductByCategory([107,109],     ex1, [3,69,83]).then(p => { if(p) ex1.push(p.product_id); return p; }),
            getRandomProductByCategory([107,109],     ex1, [3,69,83]).then(p => { if(p) ex1.push(p.product_id); return p; }),
            getRandomProductByCategory([90],          ex1, [73,124]),
        ]);
        combos = [
            { id_combo: 'C1', comboName: 'Bữa sáng tiện lợi', items: [i1_1,i1_2,i1_3,i1_4,i1_5].filter(Boolean) },
            { id_combo: 'C2', comboName: 'Sáng ấm bụng',
              items: (await Promise.all([
                  getRandomProductByCategory([98,101],   ex2, [79,108]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([98,101],   ex2, [79,108]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([82,69,83], ex2, [83]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([82,69,83], ex2, [83]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([108],      ex2, [74,98]),
              ])).filter(Boolean)
            },
            { id_combo: 'C3', comboName: 'Healthy Sáng',
              items: (await Promise.all([
                  getRandomProductByCategory([103], ex3, [73,124]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([103], ex3, [73,124]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([90],  ex3, [130]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([90],  ex3, [130]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([130], ex3, [90]),
              ])).filter(Boolean)
            },
        ];
    } else if (hour >= 11 && hour < 16) {
        title = '☀️ Gợi ý combo ăn trưa & giải nhiệt';
        const ex1 = [], ex2 = [], ex3 = [];
        combos = [
            { id_combo: 'C1', comboName: 'Cơm trưa nhanh gọn',
              items: (await Promise.all([
                  getRandomProductByCategory([98,101,104], ex1, [74,98]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([98,101,104], ex1, [74,98]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([98,101,104], ex1, [74,98]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([83], ex1, [3,69]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([83], ex1, [3,69]),
              ])).filter(Boolean)
            },
            { id_combo: 'C2', comboName: 'Giải nhiệt thanh mát',
              items: (await Promise.all([
                  getRandomProductByCategory([90], ex2, [95,96]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([90], ex2, [95,96]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([90], ex2, [95,96]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([130], ex2, [93,107]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([130], ex2, [93,107]),
              ])).filter(Boolean)
            },
            { id_combo: 'C3', comboName: 'Nạp đường xế chiều',
              items: (await Promise.all([
                  getRandomProductByCategory([93,94,95], ex3, [90]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([93,94,95], ex3, [90]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([93,94,95], ex3, [90]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([69], ex3, [3,82]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([69], ex3, [3,82]),
              ])).filter(Boolean)
            },
        ];
    } else {
        title = '🌙 Combo buổi tối & Ăn đêm';
        const ex1 = [], ex2 = [], ex3 = [];
        combos = [
            { id_combo: 'C1', comboName: 'Nấu cơm gia đình',
              items: (await Promise.all([
                  getRandomProductByCategory([112,113,115,117], ex1, [79]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([112,113,115,117], ex1, [79]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([91,92], ex1, [108]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([91,92], ex1, [108]).then(p => { if(p) ex1.push(p.product_id); return p; }),
                  getRandomProductByCategory([112,113,115,117,91,92], ex1, [90]),
              ])).filter(Boolean)
            },
            { id_combo: 'C2', comboName: 'Cú đêm ăn liền',
              items: (await Promise.all([
                  getRandomProductByCategory([98,100], ex2, [79]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([98,100], ex2, [79]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([108], ex2, [95]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([108], ex2, [95]).then(p => { if(p) ex2.push(p.product_id); return p; }),
                  getRandomProductByCategory([69],  ex2, [83]),
              ])).filter(Boolean)
            },
            { id_combo: 'C3', comboName: 'Trái cây tráng miệng & Đồ nhắm',
              items: (await Promise.all([
                  getRandomProductByCategory([90],  ex3, [95]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([118], ex3, [3,69,82]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([118], ex3, [3,69,82]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([96],  ex3, [90]).then(p => { if(p) ex3.push(p.product_id); return p; }),
                  getRandomProductByCategory([96],  ex3, [90]),
              ])).filter(Boolean)
            },
        ];
    }

    return { title, combos };
};

// ─── CORE: Sinh Combo thông minh bằng LLM (Groq/Llama) ──────────────────────
const generateCombosFromLLM = async (hour) => {
    // 1. Xác định ngữ cảnh buổi
    let timeLabel, timeTip;
    if (hour >= 6 && hour < 11) {
        timeLabel = 'buổi sáng (6h–11h)';
        timeTip   = 'Ưu tiên: đồ ăn sáng nhẹ nhàng, đồ uống nóng/lạnh, sữa, bánh mì, ngũ cốc, cháo.';
    } else if (hour >= 11 && hour < 16) {
        timeLabel = 'buổi trưa và xế chiều (11h–16h)';
        timeTip   = 'Ưu tiên: cơm hộp, mì ăn liền, đồ ăn liền no bụng, nước giải khát, trà, đá lạnh.';
    } else {
        timeLabel = 'buổi tối và ăn đêm (16h–6h)';
        timeTip   = 'Ưu tiên chung cho buổi tối: đồ nấu cơm, đồ ăn nhẹ ban đêm, snack, bia/nước ngọt.\nĐẶC BIỆT LƯU Ý RIÊNG CHO COMBO "Nấu cơm gia đình":\n1. Tuyệt đối KHÔNG chọn gia vị (dầu ăn, nước mắm, xì dầu, tương ớt, muối...).\n2. Tuyệt đối KHÔNG chọn đồ ăn vặt, snack, bim bim, bánh kẹo. CHỈ chọn nguyên liệu tươi sống (thịt, cá, rau củ), thực phẩm đông lạnh, hoặc các nguyên liệu để nấu bữa chính.';
    }

    // 2. Truy vấn ngẫu nhiên ~60 sản phẩm thực phẩm từ DB làm "Candidate Pool"
    const [poolRows] = await db.query(
        `SELECT
            p.product_id,
            p.product_name,
            c.category_name,
            MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price,
                   v.variant_discount, v.variant_price)) AS display_price
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN product_variants v ON p.product_id = v.product_id
         WHERE p.category_id IN (${FOOD_CATEGORY_IDS.join(',')})
           AND p.product_active = 1
           AND p.is_deleted = 0
           AND p.product_name NOT LIKE '%Thùng%'
           AND p.product_name NOT LIKE '%Lốc%'
           AND p.product_name NOT LIKE '%Combo%'
         GROUP BY p.product_id
         HAVING SUM(v.variant_quantity) > 0
         ORDER BY RAND()
         LIMIT 60`
    );

    if (poolRows.length < 5) {
        throw new Error('Không đủ sản phẩm để LLM chọn lựa.');
    }

    // 3. Chuyển dữ liệu thành danh sách text gọn để đưa vào Prompt
    const productList = poolRows.map(p =>
        `[ID:${p.product_id}] ${p.product_name} (${p.category_name || 'N/A'}) - ${Number(p.display_price).toLocaleString('vi-VN')}đ`
    ).join('\n');

    // 4. Tên combo CỐ ĐỊNH theo từng ca (giống code cũ, AI chỉ chọn sản phẩm)
    let title, fixedComboNames;
    if (hour >= 6 && hour < 11) {
        title           = '🌅 Năng lượng buổi sáng';
        fixedComboNames = ['Bữa sáng tiện lợi', 'Sáng ấm bụng', 'Healthy Sáng'];
    } else if (hour >= 11 && hour < 16) {
        title           = '☀️ Gợi ý combo ăn trưa & giải nhiệt';
        fixedComboNames = ['Bữa trưa nhanh gọn', 'Giải nhiệt thanh mát', 'Nạp đường xế chiều'];
    } else {
        title           = '🌙 Combo buổi tối & Ăn đêm';
        fixedComboNames = ['Nấu cơm gia đình', 'Cú đêm ăn liền', 'Trái cây tráng miệng & Đồ nhắm'];
    }

    // 5. Xây dựng Prompt — truyền tên cố định, AI chỉ chọn sản phẩm phù hợp
    const systemPrompt = `Bạn là chuyên gia dinh dưỡng và tư vấn thực phẩm cho chuỗi siêu thị tiện lợi EzyMart.
Nhiệm vụ duy nhất: Chọn sản phẩm phù hợp từ danh sách để điền vào các Combo đã được đặt tên sẵn.
Trả về ĐÚNG và CHỈ một mảng JSON hợp lệ, KHÔNG kèm bất kỳ văn bản giải thích hay markdown nào.

SCHEMA BẮT BUỘC (giữ nguyên thứ tự và tên combo):
[
  { "comboName": "${fixedComboNames[0]}", "itemIds": [id1, id2, id3, id4, id5] },
  { "comboName": "${fixedComboNames[1]}", "itemIds": [id1, id2, id3, id4, id5] },
  { "comboName": "${fixedComboNames[2]}", "itemIds": [id1, id2, id3, id4, id5] }
]

QUY TẮC TUYỆT ĐỐI:
- KHÔNG được đổi tên combo, phải giữ nguyên đúng tên trong SCHEMA.
- Mỗi combo phải có đúng từ 4 đến 5 sản phẩm (itemIds).
- Các sản phẩm trong CÙNG một combo phải ĂN ĐƯỢC/UỐNG ĐƯỢC cùng nhau, phù hợp với tên combo đó.
- KHÔNG được dùng cùng một product_id ở 2 combo khác nhau.
- CHỈ được dùng các ID có trong danh sách cung cấp. TUYỆT ĐỐI KHÔNG bịa ID.`;

    const userMessage = `Hiện tại là ${timeLabel}.
${timeTip}

Danh sách sản phẩm trong kho EzyMart (CHỈ chọn từ đây):
${productList}

Hãy chọn sản phẩm phù hợp cho từng combo theo tên đã định sẵn. Trả về JSON array thuần túy.`;

    // 6. Gọi Groq/Llama
    console.log(`[LLM Combo] Gửi ${poolRows.length} sản phẩm cho Llama phân tích (${timeLabel})...`);
    const rawResponse = await groqService.getChatCompletion(systemPrompt, userMessage, 0.5, 600);

    // 7. Parse JSON từ response
    const jsonMatch = rawResponse?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('LLM không trả về JSON hợp lệ: ' + rawResponse?.slice(0, 200));
    const llmCombos = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(llmCombos) || llmCombos.length === 0) {
        throw new Error('LLM trả về mảng rỗng hoặc không hợp lệ.');
    }

    // 8. Validate và map lại — override tên về đúng tên cố định dù LLM có đổi
    const poolIdSet = new Set(poolRows.map(p => p.product_id));
    const validCombos = llmCombos
        .filter(c => Array.isArray(c.itemIds) && c.itemIds.length >= 2)
        .map((c, idx) => ({
            id_combo:  `C${idx + 1}`,
            comboName: fixedComboNames[idx] ?? c.comboName, // ← luôn dùng tên cố định
            itemIds:   c.itemIds.filter(id => poolIdSet.has(Number(id))).slice(0, 5)
        }))
        .filter(c => c.itemIds.length >= 2);

    if (validCombos.length === 0) throw new Error('Không có combo nào hợp lệ sau khi validate.');

    // 9. Truy vấn lại DB để lấy đầy đủ thông tin sản phẩm
    const allItemIds = [...new Set(validCombos.flatMap(c => c.itemIds))];
    const [productDetails] = await db.query(
        `SELECT
            p.product_id,
            p.product_name,
            p.product_image,
            p.category_id,
            MIN(v.variant_price) AS original_price,
            MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price,
                   v.variant_discount, v.variant_price)) AS price
         FROM products p
         LEFT JOIN product_variants v ON p.product_id = v.product_id
         WHERE p.product_id IN (${allItemIds.join(',')})
         GROUP BY p.product_id`
    );
    const productMap = Object.fromEntries(productDetails.map(p => [p.product_id, p]));

    // 10. Ghép combos hoàn chỉnh
    const combos = validCombos.map(c => ({
        id_combo:  c.id_combo,
        comboName: c.comboName,
        items:     c.itemIds.map(id => productMap[Number(id)]).filter(Boolean)
    }));

    console.log(`[LLM Combo] ✅ Llama tạo thành công ${combos.length} combo cho ${timeLabel}.`);
    return { title, combos };
};


// ─── In-flight Lock: tránh gọi LLM nhiều lần khi nhiều request cùng lúc ──────
// Key = time slot identifier ('morning'/'afternoon'/'night')
// Value = Promise đang chạy (chưa resolve)
const inFlightPromises = {};

// ─── Main Controller ─────────────────────────────────────────────────────────
const getDailyCombo = async (req, res) => {
    try {
        let hour = new Date().getHours();

        // Hỗ trợ tham số ?hour= để test (test mode KHÔNG dùng cache/lock)
        const isTest = req.query.hour !== undefined;
        if (isTest) {
            const parsedHour = parseInt(req.query.hour, 10);
            if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
                hour = parsedHour;
            }
        }

        // ── 1. Kiểm tra Cache trước (production mode) ─────────────────────
        if (!isTest) {
            const cached = comboCache.getCache(hour);
            if (cached) {
                console.log('[Combo] Cache hit, trả về combo từ cache.');
                return res.json({ success: true, title: cached.title, combos: cached.combos });
            }
        }

        let title, combos;

        if (!isTest) {
            // ── 2. In-flight Lock: nếu đã có request đang gọi LLM cho ca này,
            //       chờ chung kết quả thay vì gọi thêm ──────────────────────
            const slotKey = comboCache.getTimeSlotIdentifier(hour);

            if (!inFlightPromises[slotKey]) {
                // Tạo promise mới và lưu vào lock
                inFlightPromises[slotKey] = (async () => {
                    try {
                        const result = await generateCombosFromLLM(hour);
                        return result;
                    } catch (llmError) {
                        console.warn('[LLM Combo] LLM lỗi, dùng Fallback:', llmError.message);
                        return await generateCombosWithFallback(hour);
                    }
                })().finally(() => {
                    // Xóa lock sau khi xong (dù thành công hay lỗi)
                    delete inFlightPromises[slotKey];
                });
            } else {
                console.log(`[Combo] Request đang chờ in-flight LLM call (slot: ${slotKey})...`);
            }

            // Tất cả request dùng chung 1 promise
            ({ title, combos } = await inFlightPromises[slotKey]);

        } else {
            // Test mode: gọi trực tiếp, không cache, không lock
            try {
                ({ title, combos } = await generateCombosFromLLM(hour));
            } catch (llmError) {
                console.warn('[LLM Combo] LLM lỗi (test mode), dùng Fallback:', llmError.message);
                ({ title, combos } = await generateCombosWithFallback(hour));
            }
        }

        // ── 3. Bổ sung variants cho từng sản phẩm ─────────────────────────
        for (const combo of combos) {
            for (const item of combo.items) {
                if (item) {
                    item.variants = await getVariantsForProduct(item.product_id);
                }
            }
        }

        // ── 4. Lưu vào Cache (chỉ production mode) ────────────────────────
        if (!isTest) {
            comboCache.setCache(hour, title, combos);
            console.log('[Combo] ✅ Đã lưu cache từ LLM. Các request F5 tiếp theo sẽ dùng cache.');
        }

        return res.json({ success: true, title, combos });

    } catch (error) {
        console.error('[Combo] Lỗi getDailyCombo:', error);
        // Trả về lỗi rõ ràng thay vì crash server
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Lỗi server khi lấy gợi ý combo.' });
        }
    }
};

module.exports = { getDailyCombo, generateCombosFromLLM, generateCombosWithFallback };
