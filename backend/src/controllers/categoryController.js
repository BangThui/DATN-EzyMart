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
        const { category_name } = req.body;
        if (!category_name) return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });

        const [result] = await CategoryModel.create(category_name);
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
        const { category_name } = req.body;
        await CategoryModel.update(id, category_name);
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
