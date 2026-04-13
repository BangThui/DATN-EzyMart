import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Breadcrumb, Spin, Select, Empty } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import ProductCard from '../../components/product/ProductCard';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';

const Category = () => {
    const { categoryId } = useParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [prods, cats] = await Promise.all([
                    productService.getAll({ category_id: categoryId }),
                    categoryService.getAll(),
                ]);
                setProducts(prods || []);
                setCategories(cats || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
        window.scrollTo(0, 0);
    }, [categoryId]);

    const currentCat = categories.find(c => c.category_id == categoryId);
    const filtered = [...products].filter(p => p.category_id == categoryId);
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'price_asc') return (a.product_discount || a.product_price) - (b.product_discount || b.product_price);
        if (sortBy === 'price_desc') return (b.product_discount || b.product_price) - (a.product_discount || a.product_price);
        if (sortBy === 'name') return a.product_name.localeCompare(b.product_name);
        return 0;
    });

    return (
        <div>
            {/* Breadcrumb */}
            <div className="page-breadcrumb">
                <Breadcrumb items={[
                    { title: <Link to="/">Trang chủ</Link> },
                    { title: currentCat?.category_name || `Danh mục ${categoryId}` },
                ]} />
            </div>

            <div className="page-wrap" style={{ padding: '24px 24px 60px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <h2 className="section-title">{currentCat?.category_name || 'Danh mục sản phẩm'}</h2>
                        <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0 0' }}>
                            {sorted.length} sản phẩm
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FilterOutlined style={{ color: '#94a3b8' }} />
                        <Select
                            value={sortBy}
                            onChange={setSortBy}
                            style={{ width: 200 }}
                            options={[
                                { value: 'default', label: 'Mặc định' },
                                { value: 'price_asc', label: 'Giá: Thấp → Cao' },
                                { value: 'price_desc', label: 'Giá: Cao → Thấp' },
                                { value: 'name', label: 'Tên A → Z' },
                            ]}
                        />
                    </div>
                </div>

                {/* Products */}
                {loading ? (
                    <div className="loading-center"><Spin size="large" /></div>
                ) : sorted.length === 0 ? (
                    <div className="empty-center">
                        <Empty description="Không có sản phẩm trong danh mục này" />
                    </div>
                ) : (
                    <div className="products-grid">
                        {sorted.map(p => (
                            <ProductCard key={p.product_id} product={p} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Category;
