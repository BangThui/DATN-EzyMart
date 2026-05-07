import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Breadcrumb, Spin, Select, Empty, Layout, theme } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import ProductCard from '../../components/product/ProductCard';
import ProductSidebarFilter from '../../components/product/ProductSidebarFilter';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';

const { Content } = Layout;

const Category = () => {
    const { categoryId: paramCategoryId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Fallback to URL param if search param not present (for backward compatibility)
    const categoryId = searchParams.get('category_id') || paramCategoryId;
    const brandId = searchParams.get('brand_id');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');

    const { token } = theme.useToken();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Sử dụng API filterProducts thay vì getAll để sử dụng bộ lọc DB
                const [prods, cats] = await Promise.all([
                    productService.filterProducts({ 
                        category_id: categoryId,
                        brand_id: brandId,
                        minPrice,
                        maxPrice
                    }),
                    categoryService.getAll(),
                ]);
                setProducts(prods || []);
                setCategories(cats || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
        window.scrollTo(0, 0);
    }, [categoryId, brandId, minPrice, maxPrice]);

    const currentCat = categories.find(c => c.category_id == categoryId);
    
    // Sort logic (products are already filtered by backend)
    const sorted = [...products].sort((a, b) => {
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
                    { title: currentCat?.category_name || 'Cửa hàng' },
                ]} />
            </div>

            <div className="page-wrap" style={{ padding: '24px 24px 60px' }}>
                <Layout style={{ background: 'transparent' }} hasSider>
                    <ProductSidebarFilter />
                    
                    <Content style={{ paddingLeft: 24 }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                            <div>
                                <h2 className="section-title">{currentCat?.category_name || 'Tất cả sản phẩm'}</h2>
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
                            <div className="empty-center" style={{ background: '#fff', padding: 40, borderRadius: 8 }}>
                                <Empty description="Không có sản phẩm nào phù hợp với bộ lọc" />
                            </div>
                        ) : (
                            <div className="products-grid">
                                {sorted.map(p => (
                                    <ProductCard key={p.product_id} product={p} />
                                ))}
                            </div>
                        )}
                    </Content>
                </Layout>
            </div>
        </div>
    );
};

export default Category;
