const db = require('../config/db');
const comboCache = require('../utils/comboCache');
const groqService = require('../services/GroqService');

// ─── Truy xuất sản phẩm liên quan từ DB ──────────────────────────────────────
async function fetchProductContext(userMessage) {
    try {
        // Hàm bỏ dấu tiếng Việt để fallback search
        const removeDiacritics = (str) =>
            str.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .replace(/đ/g, 'd')
               .replace(/Đ/g, 'D');

        // Stop-words mở rộng: hư từ, đại từ, câu hỏi, động từ phụ
        const stopWords = new Set([
            'bạn', 'mình', 'tôi', 'của', 'và', 'với', 'cho', 'là', 'có',
            'không', 'được', 'trong', 'này', 'một', 'các', 'để', 'bao',
            'nhiêu', 'giá', 'mua', 'hàng', 'sản', 'phẩm', 'gì', 'cần',
            'hỏi', 'còn', 'ơi', 'ạ', 'nhé', 'nha', 'thôi', 'vậy', 'rồi',
            'nữa', 'thế', 'đó', 'đây', 'kia', 'khi', 'nào', 'mà', 'muốn',
            'biết', 'xem', 'tìm', 'kiếm', 'dùng', 'như', 'vẫn', 'đang',
            'the', 'and', 'for', 'are', 'what', 'how', 'much', 'about',
            'have', 'this', 'that', 'with', 'from', 'they', 'will', 'been'
        ]);

        // 1. LÀM SẠCH ĐẦU VÀO
        const normalized = userMessage.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();

        const keywords = normalized
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .split(/\s+/)
            .filter(w => w.length >= 2 && !stopWords.has(w));

        if (keywords.length === 0) return { context: null, products: [] };

        // 2. TÁCH TỪ KHÓA ĐỘNG (STRICT AND)
        const likeConditionsAND = keywords.map(() =>
            '(p.product_name COLLATE utf8mb4_unicode_ci LIKE ? OR p.product_name LIKE ?)'
        ).join(' AND ');

        const likeParams = keywords.flatMap(k => [
            `%${k}%`,
            `%${removeDiacritics(k)}%`
        ]);

        let [rows] = await db.query(
            `SELECT
                p.product_id,
                p.product_name,
                p.product_image,
                c.category_name,
                MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price)) AS min_price,
                MAX(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price)) AS max_price,
                MIN(v.variant_price) AS original_price,
                (SELECT pv2.variant_id FROM product_variants pv2 WHERE pv2.product_id = p.product_id ORDER BY pv2.variant_id ASC LIMIT 1) AS default_variant_id,
                GROUP_CONCAT(
                    CONCAT(
                        v.variant_name, ' (', 
                        IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, FORMAT(v.variant_discount, 0), FORMAT(v.variant_price, 0)), 
                        'đ)'
                    )
                    ORDER BY IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price) ASC
                    SEPARATOR ' | '
                ) AS variants_info
             FROM products p
             LEFT JOIN categories       c ON p.category_id   = c.category_id
             LEFT JOIN product_variants v ON p.product_id    = v.product_id
             WHERE p.is_deleted = 0
               AND p.product_active = 1
               AND (${likeConditionsAND})
             GROUP BY p.product_id
             HAVING SUM(v.variant_quantity) > 0
             ORDER BY p.product_id DESC
             LIMIT 5`,
            likeParams
        );

        // 3. KIỂM TRA ĐỘ CHÍNH XÁC (NẾU 0 KẾT QUẢ -> RELAXED QUERY)
        if (rows.length === 0 && keywords.length >= 2) {
            const scoreExpressions = keywords.map(() => 
                'IF(p.product_name COLLATE utf8mb4_unicode_ci LIKE ? OR p.product_name LIKE ?, 1, 0)'
            ).join(' + ');

            [rows] = await db.query(
                `SELECT
                    p.product_id,
                    p.product_name,
                    p.product_image,
                    c.category_name,
                    MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price)) AS min_price,
                    MAX(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price)) AS max_price,
                    MIN(v.variant_price) AS original_price,
                    (SELECT pv2.variant_id FROM product_variants pv2 WHERE pv2.product_id = p.product_id ORDER BY pv2.variant_id ASC LIMIT 1) AS default_variant_id,
                    GROUP_CONCAT(
                        CONCAT(
                            v.variant_name, ' (', 
                            IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, FORMAT(v.variant_discount, 0), FORMAT(v.variant_price, 0)), 
                            'đ)'
                        )
                        ORDER BY IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price) ASC
                        SEPARATOR ' | '
                    ) AS variants_info,
                    (${scoreExpressions}) AS match_score
                 FROM products p
                 LEFT JOIN categories       c ON p.category_id   = c.category_id
                 LEFT JOIN product_variants v ON p.product_id    = v.product_id
                 WHERE p.is_deleted = 0
                   AND p.product_active = 1
                 GROUP BY p.product_id
                 HAVING SUM(v.variant_quantity) > 0 AND match_score >= 2
                 ORDER BY match_score DESC, p.product_id DESC
                 LIMIT 5`,
                likeParams
            );
        }

        if (rows.length === 0) return { context: null, products: [] };

        // Text context để đưa vào system prompt cho Llama
        const lines = rows.map(r => {
            const priceRange =
                r.min_price === r.max_price
                    ? `${Number(r.min_price).toLocaleString('vi-VN')}đ`
                    : `${Number(r.min_price).toLocaleString('vi-VN')}đ – ${Number(r.max_price).toLocaleString('vi-VN')}đ`;
            return `• ${r.product_name} (${r.category_name || 'N/A'}): ${priceRange}\n  Các loại: ${r.variants_info || 'N/A'}`;
        });

        // Structured products array để frontend render mini card
        const products = rows.map(r => ({
            product_id:         r.product_id,
            product_name:       r.product_name,
            product_image:      r.product_image,
            display_price:      Number(r.min_price),
            original_price:     Number(r.original_price),
            has_discount:       Number(r.min_price) < Number(r.original_price),
            default_variant_id: r.default_variant_id,
        }));

        return {
            context: `📦 Sản phẩm liên quan trong kho EzyMart:\n${lines.join('\n')}`,
            products,
        };
    } catch (err) {
        console.error('[RAG] Lỗi truy vấn sản phẩm:', err);
        return { context: null, products: [] };
    }
}

// ─── Helper lấy sản phẩm ngẫu nhiên theo danh mục — trả đủ data cho mini card ─────────────────
async function getRandomProduct(categoryIds, excludeIds = [], fallbackIds = []) {
    const exc = excludeIds.length > 0 ? `AND p.product_id NOT IN (${excludeIds.join(',')})` : '';
    const tryQuery = async (catIds) => {
        const [rows] = await db.query(
            `SELECT
                p.product_id,
                p.product_name,
                p.product_image,
                MIN(v.variant_price)                                                                         AS original_price,
                MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price,
                       v.variant_discount, v.variant_price))                                                 AS display_price,
                (SELECT pv2.variant_id FROM product_variants pv2
                 WHERE pv2.product_id = p.product_id ORDER BY pv2.variant_id ASC LIMIT 1)                    AS default_variant_id
             FROM products p
             LEFT JOIN product_variants v ON p.product_id = v.product_id
             WHERE p.category_id IN (${catIds.join(',')}) AND p.product_active = 1 AND p.is_deleted = 0
               AND p.product_name NOT LIKE '%Thùng%' AND p.product_name NOT LIKE '%Lốc%'
               ${exc}
             GROUP BY p.product_id ORDER BY RAND() LIMIT 1`
        );
        if (!rows[0]) return null;
        const r = rows[0];
        return {
            product_id:         r.product_id,
            product_name:       r.product_name,
            product_image:      r.product_image,
            display_price:      Number(r.display_price),
            original_price:     Number(r.original_price),
            has_discount:       Number(r.display_price) < Number(r.original_price),
            default_variant_id: r.default_variant_id,
        };
    };
    return (await tryQuery(categoryIds))
        || (fallbackIds.length ? await tryQuery(fallbackIds) : null);
}

// ─── Lấy dữ liệu Combo thực tế từ DB — trả { context, comboProducts } ────────
async function fetchComboContext(timeSlot) {
    try {
        const hour = new Date().getHours();

        // --- ĐỌC TỪ CACHE TRƯỚC ---
        const cachedData = comboCache.getCache(hour);
        if (cachedData) {
            const comboProducts = cachedData.combos.map(combo => {
                return {
                    comboName: combo.comboName,
                    items: combo.items.map(item => {
                        let original_price = Number(item.price) || 0;
                        let display_price = Number(item.price) || 0;
                        let default_variant_id = null;

                        if (item.variants && item.variants.length > 0) {
                            default_variant_id = item.variants[0].variant_id;
                            original_price = Math.min(...item.variants.map(v => Number(v.variant_price)));
                            display_price = Math.min(...item.variants.map(v => {
                                const vp = Number(v.variant_price);
                                const vd = Number(v.variant_discount);
                                return (vd > 0 && vd < vp) ? vd : vp;
                            }));
                        }

                        return {
                            product_id: item.product_id,
                            product_name: item.product_name,
                            product_image: item.product_image,
                            display_price,
                            original_price,
                            has_discount: display_price < original_price,
                            default_variant_id
                        };
                    })
                };
            });

            const comboLines = comboProducts.map(({ comboName, items }) => {
                const totalPrice = items.reduce((sum, item) => sum + (item.display_price || 0), 0);
                return `  • ${comboName} - Tổng giá trọn bộ: ${totalPrice.toLocaleString('vi-VN')}đ`;
            });

            const context =
                `🛒 ${cachedData.title}\n` +
                `Các Combo đang hiển thị trên trang chủ EzyMart buổi ${timeSlot || 'này'}:\n` +
                comboLines.join('\n') + '\n' +
                `Khách có thể chọn từng Combo và nhấn "Thêm nhanh combo vào giỏ" để mua cả bộ.`;

            return { context, comboProducts };
        }
        // --- NẾU CACHE RỖNG THÌ FALLBACK BỐC MỚI ---

        const isMorning   = (timeSlot === 'Sáng') || (!timeSlot && hour >= 6  && hour < 11);
        const isAfternoon = (timeSlot === 'Trưa') || (!timeSlot && hour >= 11 && hour < 16);

        let title = '';
        // Mỗi combo: { comboName, slots: [[catIds, fallbackIds], ...] } — 5 slot/combo
        let comboDefinitions = [];

        if (isMorning) {
            title = '🌅 Năng lượng buổi sáng';
            comboDefinitions = [
                { comboName: 'Bữa sáng tiện lợi', slots: [[125,126,130],[125,126,130],[107,109],[107,109],[90]] },
                { comboName: 'Sáng ấm bụng',      slots: [[98,101],[98,101],[82,69,83],[82,69,83],[108]] },
                { comboName: 'Healthy Sáng',       slots: [[103],[103],[90],[90],[130]] },
            ];
        } else if (isAfternoon) {
            title = '☀️ Gợi ý combo ăn trưa & giải nhiệt';
            comboDefinitions = [
                { comboName: 'Cơm trưa nhanh gọn',  slots: [[98,101,104],[98,101,104],[98,101,104],[83],[83]] },
                { comboName: 'Giải nhiệt thanh mát', slots: [[90],[90],[90],[130],[130]] },
                { comboName: 'Nạp đường xế chiều',  slots: [[93,94,95],[93,94,95],[93,94,95],[69],[69]] },
            ];
        } else {
            title = '🌙 Combo buổi tối & Ăn đêm';
            comboDefinitions = [
                { comboName: 'Nấu cơm gia đình',              slots: [[112,113,115,117],[112,113,115,117],[91,92],[91,92],[88,89]] },
                { comboName: 'Cú đêm ăn liền',                slots: [[98,100],[98,100],[108],[108],[69]] },
                { comboName: 'Trái cây tráng miệng & Đồ nhắm',slots: [[90],[118],[118],[96],[96]] },
            ];
        }

        // Lấy sản phẩm song song cho mỗi combo
        const comboProducts = await Promise.all(
            comboDefinitions.map(async ({ comboName, slots }) => {
                const excludeIds = [];
                const items = [];
                for (const catIds of slots) {
                    const p = await getRandomProduct(catIds, excludeIds);
                    if (p) {
                        excludeIds.push(p.product_id);
                        items.push(p);
                    }
                }
                return { comboName, items };
            })
        );

        // Text context ngắn gọn cho Llama
        const comboLines = comboProducts.map(({ comboName, items }) => {
            const totalPrice = items.reduce((sum, item) => sum + (item.display_price || 0), 0);
            return `  • ${comboName} - Tổng giá trọn bộ: ${totalPrice.toLocaleString('vi-VN')}đ`;
        });

        const context =
            `🛒 ${title}\n` +
            `Các Combo đang hiển thị trên trang chủ EzyMart buổi ${timeSlot || 'này'}:\n` +
            comboLines.join('\n') + '\n' +
            `Khách có thể chọn từng Combo và nhấn "Thêm nhanh combo vào giỏ" để mua cả bộ.`;

        return { context, comboProducts };
    } catch (err) {
        console.error('[RAG] Lỗi fetchComboContext:', err);
        return {
            context: `🛒 Hiện tại EzyMart có các Combo mua sắm thông minh theo khung giờ trên trang chủ. Vui lòng truy cập website để xem danh sách Combo đang hiển thị buổi ${timeSlot || 'này'}.`,
            comboProducts: [],
        };
    }
}

// ─── Lấy sản phẩm để tự động lên thực đơn theo ngân sách/bữa ──────────
// budget: số nguyên (VD: 50000) hoặc null
// meals: mảng ['morning','noon','night'] hoặc []
async function fetchCustomMenuContext(budget, meals = []) {
    try {
        // Tập hợp danh mục đồ ăn (sáng, trưa, tối, ăn vặt, nước)
        const foodCats = [125,126,130,107,109,98,101,104,83,90,93,94,95,69,112,113,115,117,91,92,88,89,100,108,118,96];

        const budgetHaving = budget ? `AND min_price <= ${Number(budget)}` : '';

        const baseQuery = `
            SELECT
                p.product_id,
                p.product_name,
                p.product_image,
                MIN(IF(v.variant_discount > 0 AND v.variant_discount < v.variant_price, v.variant_discount, v.variant_price)) AS min_price,
                MIN(v.variant_price) AS original_price,
                (SELECT pv2.variant_id FROM product_variants pv2 WHERE pv2.product_id = p.product_id ORDER BY pv2.variant_id ASC LIMIT 1) AS default_variant_id
             FROM products p
             LEFT JOIN product_variants v ON p.product_id = v.product_id
             WHERE p.is_deleted = 0 AND p.product_active = 1
               {CAT_FILTER}
             GROUP BY p.product_id
             HAVING min_price > 0 ${budgetHaving}
             ORDER BY RAND()
             LIMIT 30
        `;

        let [rows] = await db.query(baseQuery.replace('{CAT_FILTER}', `AND p.category_id IN (${foodCats.join(',')})`));

        // Fallback: nếu danh mục đồ ăn không ra kết quả, lấy bất kỳ sản phẩm nào
        if (rows.length === 0) {
            [rows] = await db.query(baseQuery.replace('{CAT_FILTER}', ''));
        }

        if (rows.length === 0) return null;

        const lines = rows.map(r => `• ${r.product_name}: ${Number(r.min_price).toLocaleString('vi-VN')}đ`);
        
        // Map meal codes sang tên tiếng Việt để đưa vào prompt
        const mealLabelMap = { morning: 'bữa sáng', noon: 'bữa trưa', afternoon: 'bữa chiều', night: 'bữa tối' };
        const mealLabels = meals.length > 0
            ? meals.map(m => mealLabelMap[m] || m).join(', ')
            : 'các bữa trong ngày';

        let context = `🛒 YÊU CẦU ĐẶC BIỆT: Khách hàng muốn LÊN THỰC ĐƠN cho ${mealLabels}.`;
        if (budget) context += ` Ngân sách tối đa: ${Number(budget).toLocaleString('vi-VN')}đ.`;
        context += `\nNhiệm vụ: Hãy CHỌN các món từ danh sách dưới đây để tạo thực đơn hợp lý.`;
        context += `\nYêu cầu trình bày: Phân chia rõ từng bữa ăn, TÊN MÓN (ghi chính xác nguyên văn tên món từ danh sách), giá tiền, và tính TỔNG TIỀN cuối cùng.`;
        if (budget) context += ` TỔNG TIỀN phải <= ${Number(budget).toLocaleString('vi-VN')}đ.`;
        context += `\nTUYỆT ĐỐI KHÔNG bịa thêm món ngoài danh sách.`;
        context += `\n\nDanh sách món ăn có thể chọn (CHỈ ĐƯỢC CHỌN TỪ ĐÂY):\n${lines.join('\n')}`;

        const products = rows.map(r => ({
            product_id:         r.product_id,
            product_name:       r.product_name,
            product_image:      r.product_image,
            display_price:      Number(r.min_price),
            original_price:     Number(r.original_price),
            has_discount:       Number(r.min_price) < Number(r.original_price),
            default_variant_id: r.default_variant_id,
        }));

        return { context, products };
    } catch (e) {
        console.error('[RAG] Lỗi fetchCustomMenuContext:', e);
        return null;
    }
}

// ─── Xử lý context đặc biệt theo từ khoá ────────────────────────────────────
function buildShippingContext() {
    return (
        `🚚 Chính sách vận chuyển EzyMart:\n` +
        `• FREESHIP cho đơn hàng từ 200.000đ trở lên (giao hàng tận nơi).\n` +
        `• Dưới 200.000đ: phí ship theo khoảng cách, tính khi thanh toán.\n` +
        `• Dịch vụ Click & Collect: Đặt hàng online, đến cửa hàng lấy miễn phí, không tốn phí ship.\n` +
        `• Thời gian giao hàng: 30–60 phút trong vòng bán kính 5km.`
    );
}


function isShippingQuery(msg) {
    const keys = ['ship', 'vận chuyển', 'giao hàng', 'freeship', 'phí ship', 'đặt trước', 'click', 'collect'];
    return keys.some(kw => msg.toLowerCase().includes(kw));
}

function isReturnPolicyQuery(msg) {
    const keys = ['hàng hỏng', 'lỗi', 'đổi trả', 'trả hàng', 'đổi hàng', 'hỏng', 'bảo hành'];
    return keys.some(kw => msg.toLowerCase().includes(kw));
}

function buildReturnPolicyContext() {
    return `Chính sách đổi trả EzyMart: Đổi trả miễn phí trong 24h cho hàng tươi sống.`;
}

// ─── NLU: Phân loại intent + trích xuất entities bằng Groq (JSON mode) ────────
const VALID_INTENTS = ['chat', 'get_price', 'get_combo', 'custom_menu_budget', 'policy', 'support_issue', 'small_talk'];

const NLU_SYSTEM_PROMPT = `Bạn là một bộ phân loại Hiểu Ngôn Ngữ Tự Nhiên (NLU) nghiêm ngặt dành cho trợ lý ảo siêu thị EzyMart.
Nhiệm vụ duy nhất của bạn là phân tích tin nhắn đầu vào và trả về đúng một đối tượng JSON thô.
Tuyệt đối KHÔNG bao gồm văn bản giải thích, lời chào, hay ký tự markdown (\`\`\`json) nào ngoài JSON.

## INTENT DEFINITIONS
- "chat": Chào hỏi, cảm ơn, xã giao đơn thuần. Không có yêu cầu về thực phẩm hay mua sắm.
- "get_price": Hỏi giá, tồn kho của một sản phẩm đơn lẻ cụ thể (có tên sản phẩm rõ ràng).
- "get_combo": Hỏi gợi ý ăn gì / combo theo buổi. KHÔNG có đề cập số tiền, ngân sách.
- "custom_menu_budget": Lên thực đơn / gợi ý món ăn KÈM THEO số tiền ngân sách cụ thể (dù nhỏ hay lớn). CÒN BAO GỒM: hỏi "X tiền ăn được gì", "tầm Xk ăn gì", "dưới Xk có gì ăn".
- "policy": Hỏi về phí ship, giao hàng, freeship, đổi trả, bảo hành.
- "support_issue": Khiếu nại hàng hỏng, mốc, rò rỉ, giao nhầm, yêu cầu đổi/hoàn.
- "small_talk": Câu hỏi ngoài lề không liên quan siêu thị.

## QUY TẮC ƯU TIÊN (PHẢI TUÂN THỦ TUYỆT ĐỐI)
⚠️  QUY TẮC #1 — TÍN HIỆU NGÂN SÁCH: Nếu tin nhắn có chứa BẤT KỲ đơn vị tiền tệ hoặc số tiền nào (k, nghìn, ngàn, cành, đồng, đ, lít, trăm, triệu, số + tiền) KÈM với ngữ cảnh thực phẩm / bữa ăn → BẮT BUỘC phân loại là "custom_menu_budget". KHÔNG được phân loại là "get_combo".
⚠️  QUY TẮC #2 — get_combo CHỈ dùng khi câu hỏi GỢI Ý ĂN GÌ mà HOÀN TOÀN không có đề cập số tiền.

## BUDGET EXTRACTION
- max_budget: số nguyên (Integer). Quy đổi: "50k"→50000, "100 cành"→100000, "1 lít"→100000, "trăm rưỡi"→150000, "hai trăm nghìn"→200000, "30k"→30000, "150.000đ"→150000.
- currency: "VND" nếu có ngân sách, null nếu không.

## OUTPUT SCHEMA (JSON thô, không markdown)
{"intent":"...","budget":{"max_budget":integer_or_null,"currency":"VND"_or_null},"extracted_entities":{"meals":["morning"|"noon"|"afternoon"|"night"],"product_keywords":"string"_or_null}}

## FEW-SHOT EXAMPLES
Khách: "lên cho tôi thực đơn bữa sáng 50k" → {"intent":"custom_menu_budget","budget":{"max_budget":50000,"currency":"VND"},"extracted_entities":{"meals":["morning"],"product_keywords":null}}
Khách: "Gợi ý thực đơn sáng và trưa khoảng 100 cành" → {"intent":"custom_menu_budget","budget":{"max_budget":100000,"currency":"VND"},"extracted_entities":{"meals":["morning","noon"],"product_keywords":null}}
Khách: "thiết lập menu trọn gói cả ngày dưới 150.000đ" → {"intent":"custom_menu_budget","budget":{"max_budget":150000,"currency":"VND"},"extracted_entities":{"meals":["morning","noon","afternoon","night"],"product_keywords":null}}
Khách: "tầm 30k thì ăn được gì buổi sáng shop ơi" → {"intent":"custom_menu_budget","budget":{"max_budget":30000,"currency":"VND"},"extracted_entities":{"meals":["morning"],"product_keywords":null}}
Khách: "lên thực đơn ăn tối khoảng hai trăm nghìn" → {"intent":"custom_menu_budget","budget":{"max_budget":200000,"currency":"VND"},"extracted_entities":{"meals":["night"],"product_keywords":null}}
Khách: "Trưa nay ăn gì ngon không shop" → {"intent":"get_combo","budget":{"max_budget":null,"currency":null},"extracted_entities":{"meals":["noon"],"product_keywords":null}}
Khách: "Sáng không biết ăn gì, gợi ý combo đi" → {"intent":"get_combo","budget":{"max_budget":null,"currency":null},"extracted_entities":{"meals":["morning"],"product_keywords":null}}
Khách: "Sữa tươi Ba Vì giá bao nhiêu" → {"intent":"get_price","budget":{"max_budget":null,"currency":null},"extracted_entities":{"meals":[],"product_keywords":"Sữa tươi Ba Vì"}}

Phân tích câu sau:`;

// Fallback NLU thuần regex khi Groq gặp sự cố
function fallbackNLU(message) {
    const lower = message.toLowerCase();
    const cleanMsg = lower.replace(/[.,đ]/g, '');

    // ── Detect budget (mở rộng: tầm, dưới, khoảng, số chữ) ──
    let max_budget = null;
    const writtenNumbers = {
        'một trăm': 100000, 'hai trăm': 200000, 'ba trăm': 300000,
        'trăm rưỡi': 150000, 'một lít': 100000, 'hai lít': 200000,
        'một triệu': 1000000,
    };
    for (const [text, val] of Object.entries(writtenNumbers)) {
        if (lower.includes(text)) { max_budget = val; break; }
    }
    if (!max_budget) {
        // tầm 30k / dưới 50k / khoảng 100 cành / 150.000đ
        const kMatch = cleanMsg.match(/(?:tầm|dưới|khoảng|trong|từ)?\s*(\d+)\s*(k|nghìn|ngàn|cành)/);
        const litMatch = cleanMsg.match(/(\d+)\s*lít/);
        const rawMatch = cleanMsg.match(/(\d{4,})/);
        if (kMatch) max_budget = parseInt(kMatch[1]) * 1000;
        else if (litMatch) max_budget = parseInt(litMatch[1]) * 100000;
        else if (rawMatch) max_budget = parseInt(rawMatch[1]);
    }

    // ── Detect meals ──
    const meals = [];
    if (lower.includes('sáng')) meals.push('morning');
    if (lower.includes('trưa')) meals.push('noon');
    if (lower.includes('chiều')) meals.push('afternoon');
    if (lower.includes('tối') || lower.includes('đêm') || lower.includes('khuya')) meals.push('night');
    if (lower.includes('cả ngày') || lower.includes('mỗi ngày')) {
        if (!meals.includes('morning'))   meals.push('morning');
        if (!meals.includes('noon'))      meals.push('noon');
        if (!meals.includes('night'))     meals.push('night');
    }

    // ── Detect intent (ưu tiên budget signal) ──
    const hasFoodContext = meals.length > 0 ||
        lower.includes('ăn') || lower.includes('thực đơn') ||
        lower.includes('menu') || lower.includes('món') || lower.includes('bữa');
    const hasPolicy = lower.includes('ship') || lower.includes('giao hàng') || lower.includes('đổi trả') || lower.includes('freeship');
    const hasIssue  = lower.includes('hỏng') || lower.includes('mốc') || lower.includes('sai hàng') || lower.includes('lỗi');
    const hasCombo  = lower.includes('ăn gì') || lower.includes('combo') || lower.includes('gợi ý');

    let intent = 'get_price';
    // QUY TẮC ƯU TIÊN: có budget + ngữ cảnh thức ăn → custom_menu_budget
    if (max_budget && hasFoodContext) intent = 'custom_menu_budget';
    else if (lower.includes('thực đơn') || lower.includes('menu') || lower.includes('lên món')) intent = 'custom_menu_budget';
    else if (hasCombo && !max_budget) intent = 'get_combo';
    else if (hasPolicy) intent = 'policy';
    else if (hasIssue)  intent = 'support_issue';

    return {
        intent,
        budget: { max_budget, currency: max_budget ? 'VND' : null },
        extracted_entities: { meals, product_keywords: null },
    };
}

// ─── Helpers deterministic cho budget override ───────────────────────────────
function detectBudgetFromMessage(message) {
    const lower = message.toLowerCase();
    const clean = lower.replace(/[.,đ]/g, ' ');
    const written = {
        'một trăm': 100000, 'hai trăm': 200000, 'ba trăm': 300000,
        'bốn trăm': 400000, 'năm trăm': 500000,
        'trăm rưỡi': 150000, 'một lít': 100000, 'hai lít': 200000,
        'mươi lăm': 15000, 'hai mươi': 20000, 'ba mươi': 30000,
    };
    for (const [text, val] of Object.entries(written)) {
        if (lower.includes(text)) return val;
    }
    const kMatch = clean.match(/(?:tầm|dưới|khoảng|từ)?\s*(\d+)\s*(k|nghìn|ngàn|cành)(?!\s*km)/);
    if (kMatch) return parseInt(kMatch[1]) * 1000;
    const rawNum = message.replace(/\./g, '').match(/(\d{4,})/);
    if (rawNum) return parseInt(rawNum[1]);
    return null;
}

function hasFoodContextInMessage(message) {
    const lower = message.toLowerCase();
    return ['ăn', 'bữa', 'sáng', 'trưa', 'chiều', 'tối', 'khuya',
            'thực đơn', 'menu', 'món', 'combo', 'lên món', 'gợi ý',
    ].some(kw => lower.includes(kw));
}

async function parseNLU(message) {
    try {
        const raw = await groqService.getChatCompletion(
            NLU_SYSTEM_PROMPT,
            message,
            0,    // temperature 0 — ổn định tối đa
            200   // đủ cho JSON ~1 dòng (tăng đề phòng truncation)
        );
        // Lấy khối JSON đầu tiên trong response
        const jsonMatch = raw?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Không tìm thấy JSON trong response NLU');
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate intent
        if (!VALID_INTENTS.includes(parsed.intent)) parsed.intent = 'get_price';
        // Đảm bảo meals là mảng
        if (!Array.isArray(parsed.extracted_entities?.meals)) {
            parsed.extracted_entities = parsed.extracted_entities || {};
            parsed.extracted_entities.meals = [];
        }

        // ── POST-PROCESS: Budget override deterministic ──────────────────
        // Groq có thể vẫn trả về get_combo dù có ngân sách → override cứng bằng regex
        if (['get_combo', 'get_price', 'get_price'].includes(parsed.intent) ||
            !parsed.budget?.max_budget) {
            const detectedBudget = detectBudgetFromMessage(message);
            if (detectedBudget && hasFoodContextInMessage(message)) {
                parsed.intent = 'custom_menu_budget';
                if (!parsed.budget) parsed.budget = {};
                parsed.budget.max_budget = parsed.budget.max_budget || detectedBudget;
                parsed.budget.currency   = 'VND';
            }
        }

        return parsed;
    } catch (err) {
        console.error('[NLU] parseNLU lỗi, dùng fallback:', err.message);
        return fallbackNLU(message);
    }
}

// ─── Main handler ────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
    try {
        const { message, timeSlot } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const trimmedMessage = message.trim();

        // Xác nhận timeSlot hợp lệ (phòng thủ)
        const validSlots = ['Sáng', 'Trưa', 'Chiều', 'Tối', 'Khuya'];
        const safeTimeSlot = validSlots.includes(timeSlot) ? timeSlot : null;

        // ── NLU: Phân loại intent + trích xuất entities (JSON mode) ──────────
        const nlu = await parseNLU(trimmedMessage);
        const intent      = nlu.intent;
        const maxBudget   = nlu.budget?.max_budget   ?? null;
        const meals       = nlu.extracted_entities?.meals ?? [];
        const productKw   = nlu.extracted_entities?.product_keywords ?? null;
        console.log(`[NLU] intent=${intent} budget=${maxBudget} meals=[${meals}] kw=${productKw}`);

        let productResult = { context: null, products: [] };
        let comboResult   = null;
        let shippingContext     = null;
        let returnPolicyContext = null;

        if (intent === 'get_price') {
            // Dùng product_keywords nếu NLU trích xuất được, fallback về raw message
            productResult = await fetchProductContext(productKw || trimmedMessage);
        }
        if (intent === 'custom_menu_budget') {
            const customMenuResult = await fetchCustomMenuContext(maxBudget, meals);
            if (customMenuResult) {
                productResult = customMenuResult;
            } else {
                // Fallback: hiển thị combo theo giờ nếu không tìm được sản phẩm
                comboResult = await fetchComboContext(safeTimeSlot);
            }
        }
        if (intent === 'get_combo') {
            comboResult = await fetchComboContext(safeTimeSlot);
        }
        if (intent === 'policy') {
            shippingContext     = isShippingQuery(trimmedMessage)     ? buildShippingContext()     : null;
            returnPolicyContext = isReturnPolicyQuery(trimmedMessage) ? buildReturnPolicyContext() : null;
            // Nếu policy chung chung (không khớp từ khoá cụ thể) → cung cấp cả 2
            if (!shippingContext && !returnPolicyContext) {
                shippingContext     = buildShippingContext();
                returnPolicyContext = buildReturnPolicyContext();
            }
        }
        // intent === 'chat' | 'small_talk' → không fetch gì → knowledgeContext trống → áp dụng quy tắc 4

        const { context: productContext, products } = productResult;
        const comboContext  = comboResult?.context      || null;
        const comboProducts = comboResult?.comboProducts || [];

        // Ghép Danh sách thông tin: sản phẩm → combo → shipping → returnPolicy
        const contextParts = [productContext, comboContext, shippingContext, returnPolicyContext].filter(Boolean);
        const knowledgeContext = contextParts.length > 0
            ? contextParts.join('\n\n')
            : null;

        // ── System Prompt với quy tắc nghiêm ngặt ───────────────
        const systemPrompt = [
            `Bạn là nhân viên tư vấn khách hàng thân thiện, chuyên nghiệp của siêu thị tiện lợi EzyMart.`,
            `Nhiệm vụ của bạn là giao tiếp với khách hàng và trả lời các thắc mắc dựa trên Danh sách thông tin cung cấp.`,
            `Hiện tại đang là buổi ${safeTimeSlot || 'trong ngày'}.`,
            '',
            `📌 QUY TẮC PHẢN HỒI BẮT BUỘC:`,
            `1. Độ dài và văn phong: Câu trả lời phải ngắn gọn, súc tích (tối đa 3–4 câu), tự nhiên như con người. Tuyệt đối KHÔNG được dùng các từ ngữ máy móc kỹ thuật như 'KnowledgeContext', 'hệ thống', 'dữ liệu', 'AI', 'văn bản cung cấp'.`,
            `2. Tính chính xác: LUÔN ưu tiên Thông tin cung cấp để trả lời. Không được tự suy diễn hay bịa thêm thông tin. Chỉ báo đúng giá sản phẩm thực tế từ Danh sách được cấp, tuyệt đối không tự bịa giá.`,
            `3. ⚠️ QUY TẮC LÊN THỰC ĐƠN THEO NGÂN SÁCH (QUAN TRỌNG):`,
            `   - Nếu khách hàng yêu cầu TỰ LÊN THỰC ĐƠN kèm theo một mức ngân sách cụ thể (Ví dụ: 50k, 100k, 150k...), bạn hãy đóng vai trò là một toán tử logic tối ưu hóa.`,
            `   - Bạn hãy chọn và phối hợp các món ăn/đồ uống từ Danh sách gợi ý được cấp sao cho: TỔNG TIỀN CỦA TOÀN BỘ THỰC ĐƠN PHẢI TIỆM CẬN SÁT NÚT VỚI NGÂN SÁCH CỦA KHÁCH (Đạt tỷ lệ từ 80% đến 100% số tiền khách đưa ra).`,
            `   - Tuyệt đối KHÔNG được chọn quá ít món hoặc chọn các món quá rẻ khiến tổng tiền thấp hơn một cách vô lý (Ví dụ: Ngân sách 100.000đ thì tổng tiền thực đơn phải đạt từ 80.000đ đến 100.000đ, không được phép dừng lại ở mức 50.000đ - 60.000đ).`,
            `   - Hãy tính toán cẩn thận: Liệt kê rõ ràng tên từng món, ghi kèm giá tiền bên cạnh, tính tổng tiền toàn bộ và số tiền còn dư (nếu có). Phân chia bố cục gãy gọn theo đúng các bữa ăn khách yêu cầu (Sáng, Trưa hoặc Tối).`,
            `   - TUYỆT ĐỐI KHÔNG tự bịa tên món ăn nằm ngoài danh sách được cung cấp dưới đây.`,
            `4. Nếu khách hỏi thông tin không có trong danh sách cung cấp hoặc vượt quá khả năng xử lý: hãy trả lời khéo léo đúng nguyên văn: "Dạ, về vấn đề này bạn vui lòng liên hệ hotline 0349484515 để nhân viên EzyMart hỗ trợ kiểm tra trực tiếp cho mình ngay ạ!".`,
            knowledgeContext
                ? `\n📚 DANH SÁCH THÔNG TIN CUNG CẤP (chỉ dùng thông tin này):\n${knowledgeContext}`
                : `\n📚 DANH SÁCH THÔNG TIN CUNG CẤP: Trống. (Hãy áp dụng quy tắc 4).`
        ].join('\n');

        // ── Gọi Groq / Llama qua Service ──────────────────────────────────────────────
        const replyContent = await groqService.getChatCompletion(systemPrompt, trimmedMessage);

        const reply = replyContent || 'Xin lỗi, mình không thể trả lời lúc này. Bạn vui lòng thử lại nhé!';

        // Nếu là yêu cầu lên thực đơn tự động, chỉ hiển thị những card sản phẩm được AI chọn và nhắc tên trong reply
        let finalProducts = products || [];
        if (intent === 'custom_menu_budget' && finalProducts.length > 0) {
            const lowerReply = reply.toLowerCase();
            finalProducts = finalProducts.filter(p => 
                lowerReply.includes(p.product_name.toLowerCase())
            );
        }

        // products: sản phẩm tìm theo từ khoá hoặc kết quả lọc menu
        // comboProducts: mảng combo [{comboName, items[]}] để render combo card
        res.json({ reply, products: finalProducts, comboProducts });
    } catch (error) {
        console.error('[Chatbot] Lỗi khi gọi API Groq:', error);
        res.status(500).json({
            error: 'Trợ lý ảo đang bận một chút, bạn vui lòng thử lại sau nhé!'
        });
    }
};

