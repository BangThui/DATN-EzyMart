const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

exports.chat = async (req, res) => {
    try {
        const { message, timeSlot } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const systemPrompt = `Bạn là nhân viên tư vấn khách hàng thân thiện của siêu thị tiện lợi EzyMart.
Câu trả lời của bạn phải ngắn gọn, súc tích (tối đa 3 câu).
Hiện tại đang là buổi ${timeSlot || 'trong ngày'}.
Đặc biệt lưu ý: Khi khách hàng hỏi về việc ăn gì, mua gì hoặc nhờ gợi ý món ăn, bạn phải chủ động hướng dẫn khách tham khảo các bộ "Combo mua sắm thông minh theo khung giờ" (đặc biệt là Combo cho buổi ${timeSlot || 'trong ngày'}) đang hiển thị ngay ngoài trang chủ của website EzyMart.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens: 256,
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

        res.json({ reply });
    } catch (error) {
        console.error('Lỗi khi gọi API Groq:', error);
        res.status(500).json({ error: 'Hệ thống Trợ lý ảo đang bận một chút, bạn vui lòng thử lại sau nhé!' });
    }
};
