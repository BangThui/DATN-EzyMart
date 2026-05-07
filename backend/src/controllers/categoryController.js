const CategoryModel = require('../models/categoryModel');

// Lấy tất cả danh mục
exports.getCategories = async (req, res) => {
    try {
        const [rows] = await CategoryModel.getAll();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh mục' });
    }
};

// Lấy danh sách danh mục phân cấp (Nested JSON)
exports.getCategoryTree = async (req, res) => {
    try {
        const [rows] = await CategoryModel.getAll();
        
        // Build tree
        const categoryMap = {};
        const tree = [];

        // Khởi tạo map
        rows.forEach(cat => {
            categoryMap[cat.category_id] = { ...cat, children: [] };
        });

        // Xây dựng cây
        rows.forEach(cat => {
            if (cat.parent_id) {
                if (categoryMap[cat.parent_id]) {
                    categoryMap[cat.parent_id].children.push(categoryMap[cat.category_id]);
                } else {
                    // Nếu parent_id không tồn tại trong DB, tạm thời đưa vào gốc
                    tree.push(categoryMap[cat.category_id]);
                }
            } else {
                tree.push(categoryMap[cat.category_id]);
            }
        });

        res.json(tree);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh mục dạng cây' });
    }
};

// Lấy 1 danh mục theo ID
exports.getCategoryById = async (req, res) => {
    try {
        const [rows] = await CategoryModel.getById(req.params.id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh mục' });
    }
};

// [ADMIN] Tạo danh mục
exports.createCategory = async (req, res) => {
    try {
        const { category_name, parent_id } = req.body;
        if (!category_name) return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });

        const [result] = await CategoryModel.create(category_name, parent_id);
        res.status(201).json({ message: 'Thêm danh mục thành công', categoryId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm danh mục' });
    }
};

// [ADMIN] Cập nhật danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, parent_id } = req.body;
        await CategoryModel.update(id, category_name, parent_id);
        res.json({ message: 'Cập nhật danh mục thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật danh mục' });
    }
};

// [ADMIN] Xóa danh mục
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await CategoryModel.delete(id);
        res.json({ message: 'Xóa danh mục thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa danh mục' });
    }
};
