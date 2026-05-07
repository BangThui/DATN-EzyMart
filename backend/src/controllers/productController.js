const ProductModel = require('../models/productModel');
const CategoryModel = require('../models/categoryModel');

// Lấy tất cả sản phẩm (có thể lọc theo category)
exports.getProducts = async (req, res) => {
    try {
        let filters = { ...req.query };
        if (filters.category) {
            const childIds = await CategoryModel.getChildIds(filters.category);
            if (childIds.length > 0) {
                filters.category = [Number(filters.category), ...childIds];
            }
        }
        const [rows] = await ProductModel.getAll(filters);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách sản phẩm' });
    }
};

// Lọc sản phẩm
exports.filterProducts = async (req, res) => {
    try {
        let { category_id, brand_id, minPrice, maxPrice } = req.query;
        
        if (category_id) {
            const childIds = await CategoryModel.getChildIds(category_id);
            if (childIds.length > 0) {
                category_id = [Number(category_id), ...childIds];
            }
        }

        const filters = { category_id, brand_id, minPrice, maxPrice };
        const [rows] = await ProductModel.filterProducts(filters);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi lọc sản phẩm:", err);
        res.status(500).json({ error: 'Lỗi Server khi lọc sản phẩm' });
    }
};

// Lấy 1 sản phẩm theo ID (kèm danh sách ảnh)
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

// [ADMIN] Tạo sản phẩm mới (hỗ trợ nhiều ảnh)
exports.createProduct = async (req, res) => {
    try {
        const { product_name, product_details, product_description, category_id, brand_id, variants, final_image_order } = req.body;

        const files = req.files || [];
        let finalImages = [];

        if (final_image_order) {
            let orderArray = [];
            try { orderArray = JSON.parse(final_image_order); } catch (e) { }
            let fileIndex = 0;
            finalImages = orderArray.map(item => {
                if (item === 'NEW_FILE') {
                    const file = files[fileIndex++];
                    return file ? file.filename : null;
                }
                return item;
            }).filter(Boolean);
        } else {
            finalImages = files.map(f => f.filename);
        }

        const product_image = finalImages.length > 0 ? finalImages[0] : '';
        const galleryImages = finalImages.length > 1 ? finalImages.slice(1) : [];

        let parsedVariants = [];
        try { if (variants) parsedVariants = JSON.parse(variants); }
        catch(e) { console.error("Lỗi parse variants", e); }

        if (!product_name || !category_id) {
            return res.status(400).json({ error: 'Tên sản phẩm và danh mục là bắt buộc' });
        }

        const [result] = await ProductModel.createWithVariants(
            { product_name, product_image, product_details, product_description, category_id, brand_id },
            parsedVariants,
            galleryImages // chỉ lưu các ảnh phụ vào product_images
        );

        res.status(201).json({ message: 'Thêm sản phẩm thành công', productId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm sản phẩm' });
    }
};

// [ADMIN] Cập nhật sản phẩm (hỗ trợ thêm/xóa nhiều ảnh)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, product_details, product_description, category_id, brand_id, variants, final_image_order } = req.body;

        let parsedVariants = [];
        try { if (variants) parsedVariants = JSON.parse(variants); }
        catch(e) { console.error("Lỗi parse variants", e); }

        // Lấy thông tin cũ
        const [existing] = await ProductModel.getById(id);
        if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        const files = req.files || [];
        let finalImages = [];

        if (final_image_order) {
            let orderArray = [];
            try { orderArray = JSON.parse(final_image_order); } catch (e) { }
            let fileIndex = 0;
            finalImages = orderArray.map(item => {
                if (item === 'NEW_FILE') {
                    const file = files[fileIndex++];
                    return file ? file.filename : null;
                }
                return item;
            }).filter(Boolean);
        } else {
            // Fallback backward compatibility
            finalImages = existing[0].product_image ? [existing[0].product_image] : [];
            const existingGallery = existing[0].images ? existing[0].images.map(img => img.image_url) : [];
            finalImages = [...finalImages, ...existingGallery, ...files.map(f => f.filename)];
        }

        const product_image = finalImages.length > 0 ? finalImages[0] : '';
        const galleryImages = finalImages.length > 1 ? finalImages.slice(1) : [];

        await ProductModel.updateWithVariants(
            id,
            { product_name, product_image, product_details, product_description, category_id, brand_id },
            parsedVariants,
            galleryImages
        );

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

// [ADMIN] Xóa 1 ảnh trong product_images
exports.deleteProductImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const [result] = await ProductModel.deleteImage(imageId, id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy ảnh' });
        }
        res.json({ message: 'Xóa ảnh thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa ảnh' });
    }
};
