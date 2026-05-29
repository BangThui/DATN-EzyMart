'use strict';

/**
 * EzyMart Chatbot — NLU Intent Classification Evaluation
 * Sử dụng groq-sdk (đã có sẵn trong project), KHÔNG cần cài thêm package.
 *
 * Chạy: node evaluation/run_evaluation.js
 * Output: evaluation/final_report.json
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs   = require('fs');
const Groq = require('groq-sdk');

// ─── Config ───────────────────────────────────────────────────────────────────
const VALID_INTENTS  = ['chat', 'get_price', 'get_combo', 'policy', 'support_issue', 'small_talk'];
const MODEL          = 'llama-3.1-8b-instant';
const DELAY_MS       = 2000;          // Tăng lên 2s để tránh rate-limit Groq (TPM)
const MAX_TOKENS     = 20;

const DIR           = path.join(__dirname);
const LOG_FILE      = path.join(DIR, 'evaluation_log.json');
const REPORT_FILE   = path.join(DIR, 'final_report.json');

// ─── Helper: delay ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Helper: parse intent từ response raw text ───────────────────────────────
function parseIntent(raw) {
    if (!raw) return 'unknown';
    const cleaned = raw.trim().toLowerCase().replace(/[^a-z_]/g, '');
    return VALID_INTENTS.includes(cleaned) ? cleaned : 'unknown';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runEvaluation() {
    // 1. Kiểm tra API key
    if (!process.env.GROQ_API_KEY) {
        console.error('❌ Không tìm thấy GROQ_API_KEY trong .env');
        process.exit(1);
    }

    // 2. Đọc test cases (bỏ comment lines vì JSON tiêu chuẩn không hỗ trợ //)
    let rawContent = fs.readFileSync(LOG_FILE, 'utf8');
    // Strip JS-style // comments trước khi parse
    rawContent = rawContent.replace(/\/\/[^\n]*/g, '');
    const testCases = JSON.parse(rawContent);
    const total = testCases.length;
    console.log(`\n🚀 EzyMart NLU Evaluation — ${total} test cases\n${'─'.repeat(55)}`);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 3. Chạy từng test case
    let passed = 0;
    const report = [];

    for (let i = 0; i < testCases.length; i++) {
        const { input, expected_intent } = testCases[i];

        let actual_intent  = 'unknown';
        let actual_response = '';

        try {
            const completion = await groq.chat.completions.create({
                model      : MODEL,
                temperature: 0,
                max_tokens : MAX_TOKENS,
                messages   : [
                    {
                        role   : 'system',
                        content: [
                            'Bạn là bộ phân loại intent cho chatbot bán hàng EzyMart.',
                            'Chỉ trả về ĐÚNG MỘT nhãn trong danh sách sau, không giải thích, không thêm bất kỳ text nào khác:',
                            'chat | get_price | get_combo | policy | support_issue | small_talk',
                            '',
                            'ĐỊNH NGHĨA TỪNG NHÃN:',
                            '• chat        — Chào hỏi (xin chào, hello, hi), cảm ơn, tạm biệt. KHÔNG hỏi thông tin gì cụ thể.',
                            '• get_price   — Hỏi GIÁ hoặc TÌNH TRẠNG TỒN KHO của một SẢN PHẨM CỤ THỂ trong siêu thị (thịt, sữa, bia, rau, bánh...).',
                            '• get_combo   — Hỏi GỢI Ý, THỰC ĐƠN, MÓN ĂN phù hợp theo buổi (sáng/trưa/tối/khuya) hoặc dịp (BBQ, lẩu...).',
                            '• policy      — Hỏi về CHÍNH SÁCH CHUNG: phí vận chuyển, miễn ship, freeship, chính sách hoàn tiền chung chung.',
                            '• support_issue — Khiếu nại, phản ánh hàng hóa CÓ VẤN ĐỀ (hỏng, mốc, có mùi, rò rỉ, nhầm lẫn), yêu cầu xử lý sự cố cụ thể.',
                            '• small_talk  — Câu hỏi NGOÀI LỀ, không liên quan đến mua sắm.',
                            '',
                            'LƯU Ý QUAN TRỌNG:',
                            '- "ship bao nhiêu tiền?" → policy',
                            '- "nhận bánh bao bị mốc, làm sao?" → support_issue (không phải policy)',
                        ].join('\n')
                    },
                    {
                        role   : 'user',
                        content: `Phân loại câu sau: "${input}"`
                    }
                ]
            });

            actual_response = completion.choices[0]?.message?.content || '';
            actual_intent   = parseIntent(actual_response);
        } catch (err) {
            actual_response = `ERROR: ${err.message}`;
            actual_intent   = 'unknown';
        }

        const isPass = actual_intent === expected_intent;
        if (isPass) passed++;

        const resultLabel = isPass ? 'PASS ✅' : 'FAIL ❌';
        const display     = input.length > 45 ? input.slice(0, 42) + '...' : input;
        console.log(`[${String(i + 1).padStart(2)}/${total}] ${resultLabel} | expected: ${expected_intent.padEnd(12)} | got: ${actual_intent.padEnd(12)} | "${display}"`);

        report.push({
            input,
            expected_intent,
            actual_intent,
            actual_response: actual_response.trim(),
            result: isPass ? 'PASS' : 'FAIL'
        });

        // Delay tránh rate-limit (bỏ qua sau test case cuối)
        if (i < testCases.length - 1) await sleep(DELAY_MS);
    }

    // 4. Tính accuracy & ghi report
    const accuracy = ((passed / total) * 100).toFixed(2) + '%';
    const finalReport = {
        total,
        passed,
        failed  : total - passed,
        accuracy,
        run_at  : new Date().toISOString(),
        report
    };

    fs.writeFileSync(REPORT_FILE, JSON.stringify(finalReport, null, 2), 'utf8');

    // 5. In summary
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`✅ Passed : ${passed}/${total}`);
    console.log(`❌ Failed : ${total - passed}/${total}`);
    console.log(`📊 Accuracy: ${accuracy}`);
    console.log(`📄 Report saved → evaluation/final_report.json\n`);

    // In chi tiết các FAIL để tiện debug
    const failures = report.filter(r => r.result === 'FAIL');
    if (failures.length > 0) {
        console.log(`\n⚠️  Failed cases (${failures.length}):`);
        failures.forEach(f => {
            console.log(`  • "${f.input}"`);
            console.log(`    expected: ${f.expected_intent}  |  got: ${f.actual_intent}  |  raw: "${f.actual_response}"`);
        });
        console.log('');
    }
}

runEvaluation().catch(err => {
    console.error('❌ Evaluation crashed:', err);
    process.exit(1);
});
