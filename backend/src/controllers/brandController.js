const BrandModel = require('../models/brandModel');
const CategoryModel = require('../models/categoryModel');
const fs = require('fs');

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
        
        const formattedRows = rows.map(row => {
            let catIds = [];
            if (row.category_ids) {
                catIds = row.category_ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            }
            return {
                ...row,
                category_ids: catIds
            };
        });

        res.json(formattedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách thương hiệu' });
    }
};

exports.getBrandById = async (req, res) => {
    try {
        const [rows] = await BrandModel.getById(req.params.id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy thương hiệu' });
        
        const brand = rows[0];
        let catIds = [];
        if (brand.category_ids) {
            catIds = brand.category_ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        }
        
        res.json({
            ...brand,
            category_ids: catIds
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy thương hiệu' });
    }
};

exports.createBrand = async (req, res) => {
    try {
        const { brand_name, category_ids } = req.body;
        if (!brand_name) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(400).json({ error: 'Tên thương hiệu là bắt buộc' });
        }

        const [existing] = await BrandModel.getByName(brand_name);
        if (existing.length > 0) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(400).json({ error: 'Tên thương hiệu đã tồn tại' });
        }

        const brand_logo = req.file ? req.file.path : null;

        const [result] = await BrandModel.create(brand_name, brand_logo);
        const newBrandId = result.insertId;

        if (category_ids) {
            let parsedIds = [];
            try {
                parsedIds = Array.isArray(category_ids) ? category_ids : JSON.parse(category_ids);
            } catch (e) {
                if (typeof category_ids === 'string') {
                    parsedIds = category_ids.split(',').map(id => parseInt(id.trim(), 10));
                }
            }
            for (let id of parsedIds) {
                if (!isNaN(id)) {
                    await BrandModel.addCategory(newBrandId, id);
                }
            }
        }

        res.status(201).json({ message: 'Thêm thương hiệu thành công', brand_id: newBrandId });
    } catch (err) {
        console.error(err);
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(500).json({ error: 'Lỗi thêm thương hiệu' });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { brand_name, category_ids } = req.body;
        
        if (!brand_name) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(400).json({ error: 'Tên thương hiệu là bắt buộc' });
        }

        const [existing] = await BrandModel.getByName(brand_name, id);
        if (existing.length > 0) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(400).json({ error: 'Tên thương hiệu đã tồn tại' });
        }

        const brand_logo = req.file ? req.file.path : null;

        await BrandModel.update(id, brand_name, brand_logo);

        if (category_ids !== undefined) {
            await BrandModel.clearCategories(id);
            let parsedIds = [];
            if (category_ids) {
                try {
                    parsedIds = Array.isArray(category_ids) ? category_ids : JSON.parse(category_ids);
                } catch (e) {
                    if (typeof category_ids === 'string') {
                        parsedIds = category_ids.split(',').map(cid => parseInt(cid.trim(), 10));
                    }
                }
            }
            for (let cid of parsedIds) {
                if (!isNaN(cid)) {
                    await BrandModel.addCategory(id, cid);
                }
            }
        }

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
