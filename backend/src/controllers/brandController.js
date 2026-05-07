const BrandModel = require('../models/brandModel');
const CategoryModel = require('../models/categoryModel');

exports.getBrands = async (req, res) => {
    try {
        let { category_id } = req.query;
        let filterId = category_id;

        if (category_id) {
            const childIds = await CategoryModel.getChildIds(category_id);
            if (childIds && childIds.length > 0) {
                filterId = [Number(category_id), ...childIds];
            }
        }

        const [rows] = await BrandModel.getAll(filterId);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách thương hiệu' });
    }
};

exports.getBrandById = async (req, res) => {
    try {
        const [rows] = await BrandModel.getById(req.params.id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy thương hiệu' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy thương hiệu' });
    }
};

exports.createBrand = async (req, res) => {
    try {
        const { brand_name, category_id } = req.body;
        if (!brand_name) return res.status(400).json({ error: 'Tên thương hiệu là bắt buộc' });

        const brand_logo = req.file ? req.file.filename : null;

        const [result] = await BrandModel.create(brand_name, brand_logo, category_id || null);
        res.status(201).json({ message: 'Thêm thương hiệu thành công', brand_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm thương hiệu' });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { brand_name, category_id } = req.body;
        
        const brand_logo = req.file ? req.file.filename : null;

        await BrandModel.update(id, brand_name, brand_logo, category_id || null);
        res.json({ message: 'Cập nhật thương hiệu thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật thương hiệu' });
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        await BrandModel.delete(id);
        res.json({ message: 'Xóa thương hiệu thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa thương hiệu' });
    }
};
