const db = require('./src/config/db');

async function test() {
    const userMessage = 'Măng chua có giá bao nhiêu';
    const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    const stopWords = new Set([
        'bạn', 'mình', 'tôi', 'của', 'và', 'với', 'cho', 'là', 'có', 'không', 'được', 'trong', 'này', 'một', 'các', 'để', 'bao', 'nhiêu', 'giá', 'mua', 'hàng', 'sản', 'phẩm', 'gì', 'cần', 'hỏi', 'còn', 'ơi', 'ạ', 'nhé', 'nha', 'thôi', 'vậy', 'rồi', 'nữa', 'thế', 'đó', 'đây', 'kia', 'khi', 'nào', 'mà', 'muốn', 'biết', 'xem', 'tìm', 'kiếm', 'dùng', 'như', 'vẫn', 'đang'
    ]);

    const normalized = userMessage.normalize('NFC').toLowerCase();
    const keywords = normalized.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
    
    console.log('Keywords:', keywords);

    const likeConditions = keywords.map(() => '(p.product_name COLLATE utf8mb4_unicode_ci LIKE ? OR p.product_name LIKE ?)').join(' AND ');
    // Oh wait! In my code I wrote .join(' OR ');
    // If I join with OR, it finds products matching ANY of the words.
    // If keywords = ['măng', 'chua'], joining with OR finds all products with 'măng' OR 'chua'.
    // If joining with OR, why wouldn't it find "măng chua"?
    // Oh wait, in my chatbotController, I DID use `OR`. Let's verify.
    
    const likeParams = keywords.flatMap(k => [`%${k}%`, `%${removeDiacritics(k)}%`]);

    const query = `
        SELECT p.product_name 
        FROM products p 
        WHERE p.is_deleted = 0 AND p.product_active = 1 AND (${likeConditions})
    `;
    console.log('Query:', query);
    console.log('Params:', likeParams);

    try {
        const [rows] = await db.query(query, likeParams);
        console.log('Results (AND):', rows);
        
        const likeConditionsOr = keywords.map(() => '(p.product_name COLLATE utf8mb4_unicode_ci LIKE ? OR p.product_name LIKE ?)').join(' OR ');
        const queryOr = `
            SELECT p.product_name 
            FROM products p 
            WHERE p.is_deleted = 0 AND p.product_active = 1 AND (${likeConditionsOr})
        `;
        const [rowsOr] = await db.query(queryOr, likeParams);
        console.log('Results (OR):', rowsOr);
        
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

test();
