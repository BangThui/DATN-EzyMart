# EzyMart Chatbot — NLU Evaluation System

Hệ thống đánh giá khả năng phân loại intent (NLU) của chatbot EzyMart.

---

## Cấu trúc thư mục

```
backend/evaluation/
├── evaluation_log.json     ← Dataset test cases (38 cases, 5 intent)
├── run_evaluation.js       ← Script chạy evaluation
├── final_report.json       ← Output tự sinh sau khi chạy (ghi đè mỗi lần)
└── README_evaluation.md    ← File này
```

---

## Cách chạy evaluation

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Chạy script
node evaluation/run_evaluation.js

# 3. Xem kết quả JSON
# → backend/evaluation/final_report.json
```

> **Yêu cầu:** File `.env` ở root `backend/` phải có dòng `GROQ_API_KEY=your_key_here`

---

## Console output mẫu

```
🚀 EzyMart NLU Evaluation — 38 test cases
───────────────────────────────────────────────────────
[ 1/38] PASS ✅ | expected: chat         | got: chat         | "Xin chào shop!"
[ 2/38] PASS ✅ | expected: chat         | got: chat         | "Hello EzyMart ơi"
[ 3/38] FAIL ❌ | expected: get_price    | got: small_talk   | "bia heineken thùng mấy tiền"
...
───────────────────────────────────────────────────────
✅ Passed : 35/38
❌ Failed : 3/38
📊 Accuracy: 92.11%
📄 Report saved → evaluation/final_report.json

⚠️  Failed cases (3):
  • "bia heineken thùng mấy tiền"
    expected: get_price  |  got: small_talk  |  raw: "small_talk"
```

---

## Cấu trúc `final_report.json`

```json
{
  "total": 38,
  "passed": 35,
  "failed": 3,
  "accuracy": "92.11%",
  "run_at": "2025-01-15T08:30:00.000Z",
  "report": [
    {
      "input": "Xin chào shop!",
      "expected_intent": "chat",
      "actual_intent": "chat",
      "actual_response": "chat",
      "result": "PASS"
    },
    ...
  ]
}
```

---

## 5 Intent được phân loại

| Intent | Mô tả | Ví dụ |
|---|---|---|
| `chat` | Chào hỏi, cảm ơn | "Xin chào", "Cảm ơn bạn" |
| `get_price` | Hỏi giá, tồn kho sản phẩm | "Ba chỉ bò Mỹ bao nhiêu?" |
| `get_combo` | Gợi ý bữa ăn theo giờ | "Tối nay ăn gì ngon?" |
| `policy` | Ship, đổi trả, bảo hành | "Miễn phí ship từ bao nhiêu?" |
| `small_talk` | Câu hỏi ngoài lề EzyMart | "Thời tiết hôm nay thế nào?" |

---

## Load báo cáo vào React Dashboard

Sau khi chạy xong, `final_report.json` là file JSON thuần. Để hiển thị báo cáo trực quan trong React:

```js
// Trong component Dashboard
import reportData from '../../backend/evaluation/final_report.json';
// hoặc fetch qua API endpoint nếu backend expose file này
```

---

## Thêm / sửa test cases

Chỉnh sửa `evaluation_log.json`. Format mỗi test case:

```json
{ "input": "câu hỏi", "expected_intent": "tên_intent" }
```

Intent hợp lệ: `chat` | `get_price` | `get_combo` | `policy` | `small_talk`

> Sau khi sửa, chạy lại `node evaluation/run_evaluation.js` để cập nhật báo cáo.
