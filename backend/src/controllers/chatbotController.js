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

// ─── NLU: Phân loại intent bằng Groq/Llama ───────────────────────────────────
const VALID_INTENTS = ['chat', 'get_price', 'get_combo', 'policy', 'support_issue', 'small_talk'];

const NLU_SYSTEM_PROMPT = `Bạn là bộ phân loại intent cho chatbot siêu thị EzyMart.
Chỉ trả về đúng một nhãn, không thêm bất kỳ text nào khác.

INTENT:
- chat: Chào hỏi, cảm ơn, tạm biệt. KHÔNG bao gồm câu hỏi có nội dung.
- get_price: Hỏi giá, tồn kho, còn hàng không. Phải liên quan sản phẩm cụ thể.
- get_combo: Hỏi gợi ý món ăn, ăn gì, nên mua gì, combo theo buổi.
- policy: Hỏi ship, giao hàng, freeship, đổi trả, bảo hành, thanh toán.
- support_issue: Khiếu nại, phản ánh hàng hóa CÓ VẤN ĐỀ (hỏng, mốc, có mùi, rò rỉ, nhầm lẫn), yêu cầu xử lý sự cố cụ thể.
- small_talk: Mọi câu hỏi ngoài lề không liên quan siêu thị.

COUNTER-EXAMPLES (tránh nhầm):
- "ship bao nhiêu tiền?" → policy (không phải get_price)
- "tỷ giá đô la hôm nay?" → small_talk (không liên quan shop)
- "bạn là AI không?" → small_talk (không phải chat)
- "nhận bánh bao bị mốc, làm sao?" → support_issue (không phải policy)
- "còn hàng không?" → get_price

Phân loại câu sau:`;

async function classifyIntent(message) {
    try {
        const raw = await groqService.getChatCompletion(
            NLU_SYSTEM_PROMPT,
            message,
            0,   // temperature: 0 — ổn định tối đa
            20   // max_tokens: 20 — chỉ cần 1 từ
        );
        const intent = raw?.trim().toLowerCase().replace(/[^a-z_]/g, '');
        return VALID_INTENTS.includes(intent) ? intent : 'get_price';
    } catch (err) {
        console.error('[NLU] classifyIntent lỗi:', err.message);
        return 'get_price'; // fallback an toàn
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

        // ── NLU: Phân loại intent trước, chỉ fetch data phù hợp ─────────────
        const intent = await classifyIntent(trimmedMessage);
        console.log(`[NLU] intent: ${intent} | message: "${trimmedMessage.substring(0, 50)}"`);

        let productResult = { context: null, products: [] };
        let comboResult   = null;
        let shippingContext     = null;
        let returnPolicyContext = null;

        if (intent === 'get_price') {
            productResult = await fetchProductContext(trimmedMessage);
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
            `Bạn là nhân viên tư vấn khách hàng thân thiện của siêu thị tiện lợi EzyMart.`,
            `Câu trả lời phải ngắn gọn, súc tích (tối đa 3–4 câu), tự nhiên như con người, tuyệt đối KHÔNG được dùng các từ máy móc như 'KnowledgeContext', 'hệ thống', 'dữ liệu', 'AI'.`,
            `Hiện tại đang là buổi ${safeTimeSlot || 'trong ngày'}.`,
            '',
            `📌 QUY TẮC BẮT BUỘC:`,
            `1. LUÔN ưu tiên Thông tin cung cấp để trả lời. Không được tự suy diễn hay bịa thêm thông tin.`,
            `2. Giá sản phẩm: TUYỆT ĐỐI không tự bịa giá. Chỉ báo đúng giá từ Thông tin cung cấp.`,
            `3. Combo: CHỈ ĐƯỢC PHÉP đề cập các Combo có tên trong Thông tin cung cấp. Tuyệt đối không tự bịa tên Combo hay món ăn không có trong danh sách. Khi khách hỏi về combo, hãy liệt kê tên combo và giá trọn bộ sau khi đã cộng tổng, không được đưa ra dải giá gây hiểu lầm.`,
            `4. Nếu khách hỏi thông tin không có trong danh sách cung cấp: hãy trả lời khéo léo đúng nguyên văn: "Dạ, về vấn đề này bạn vui lòng liên hệ hotline 0349484515 để nhân viên EzyMart hỗ trợ kiểm tra trực tiếp cho mình ngay ạ!".`,
            knowledgeContext
                ? `\n📚 Danh sách thông tin cung cấp (chỉ dùng thông tin này):\n${knowledgeContext}`
                : `\n📚 Danh sách thông tin cung cấp: Trống. (Hãy áp dụng quy tắc 4).`
        ].join('\n');

        // ── Gọi Groq / Llama qua Service ──────────────────────────────────────────────
        const replyContent = await groqService.getChatCompletion(systemPrompt, trimmedMessage);

        const reply = replyContent || 'Xin lỗi, mình không thể trả lời lúc này. Bạn vui lòng thử lại nhé!';

        // products: sản phẩm tìm theo từ khoá
        // comboProducts: mảng combo [{comboName, items[]}] để render combo card
        res.json({ reply, products: products || [], comboProducts });
    } catch (error) {
        console.error('[Chatbot] Lỗi khi gọi API Groq:', error);
        res.status(500).json({
            error: 'Trợ lý ảo đang bận một chút, bạn vui lòng thử lại sau nhé!'
        });
    }
};

