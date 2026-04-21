const ProductModel = require('../models/productModel');

// Lấy tất cả sản phẩm (có thể lọc theo category)
exports.getProducts = async (req, res) => {
    try {
        const [rows] = await ProductModel.getAll(req.query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách sản phẩm' });
    }
};

// Lấy 1 sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        const [rows] = await ProductModel.getById(req.params.id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy sản phẩm' });
    }
};

// Lấy sản phẩm tương tự
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category_id, current_id } = req.query;
        const [rows] = await ProductModel.getSimilar(category_id, current_id);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy sản phẩm tương tự' });
    }
};

// [ADMIN] Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
    try {
        const { product_name, product_details, product_description, category_id, variants } = req.body;
        const product_image = req.file ? req.file.filename : '';
        
        let parsedVariants = [];
        try { if (variants) parsedVariants = JSON.parse(variants); } 
        catch(e) { console.error("Lỗi parse variants", e); }

        if (!product_name || !category_id) {
            return res.status(400).json({ error: 'Tên sản phẩm và danh mục là bắt buộc' });
        }

        const [result] = await ProductModel.createWithVariants({
            product_name, product_image, product_details, product_description, category_id
        }, parsedVariants);

        res.status(201).json({ message: 'Thêm sản phẩm thành công', productId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm sản phẩm' });
    }
};

// [ADMIN] Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const fs = require('fs');
        fs.appendFileSync('debug.log', JSON.stringify(req.body) + '\n');
        const { product_name, product_details, product_description, category_id, variants } = req.body;

        let parsedVariants = [];
        try { if (variants) parsedVariants = JSON.parse(variants); } 
        catch(e) { console.error("Lỗi parse variants", e); }

        // Lấy thông tin cũ
        const [existing] = await ProductModel.getById(id);
        if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        const product_image = req.file ? req.file.filename : existing[0].product_image;

        await ProductModel.updateWithVariants(id, {
            product_name, product_image, product_details, product_description, category_id
        }, parsedVariants);

        res.json({ message: 'Cập nhật sản phẩm thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật sản phẩm' });
    }
};

// [ADMIN] Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await ProductModel.existsById(id);
        if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        await ProductModel.delete(id);
        res.json({ message: 'Xóa sản phẩm thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa sản phẩm' });
    }
};

// [ADMIN] Cập nhật trạng thái
exports.updateProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await ProductModel.updateStatus(id, status);
        res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái' });
    }
};

// [ADMIN] Lấy thùng rác
exports.getDeletedProducts = async (req, res) => {
    try {
        const [rows] = await ProductModel.getAll({ isdeleted: 1 });
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách thùng rác' });
    }
};

// [ADMIN] Soft Delete
exports.softDeleteProduct = async (req, res) => {
    try {
        await ProductModel.softDelete(req.params.id);
        res.json({ message: 'Đưa vào thùng rác thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi đưa vào thùng rác' });
    }
};

// [ADMIN] Phục hồi
exports.restoreProduct = async (req, res) => {
    try {
        await ProductModel.restore(req.params.id);
        res.json({ message: 'Phục hồi thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi phục hồi' });
    }
};
