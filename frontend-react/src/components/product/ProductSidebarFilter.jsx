import React, { useState, useEffect } from 'react';
import { Layout, Menu, Slider, Typography, Spin, Checkbox, Space } from 'antd';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { categoryService } from '../../services/categoryService';
import { brandService } from '../../services/brandService';
import './ProductSidebarFilter.css';

const { Sider } = Layout;
const { Title, Text } = Typography;

const ProductSidebarFilter = () => {
    const { categoryId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const currentCategoryId = searchParams.get('category_id') || categoryId || '';
    const currentBrandId = searchParams.get('brand_id') || '';
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 5000000;
    const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);

    useEffect(() => {
        const fetchFilters = async () => {
            setLoading(true);
            try {
                const [cats, brds] = await Promise.all([
                    categoryService.getTree(),
                    brandService.getAll()
                ]);
                setCategories(cats || []);
                setBrands(brds || []);
            } catch (error) {
                console.error("Failed to load filters", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFilters();
    }, []);

    // Helper to format category tree for Antd Menu
    const formatMenu = (tree) => {
        return tree.map(node => {
            const item = {
                key: node.category_id.toString(),
                label: node.category_name
            };
            if (node.children && node.children.length > 0) {
                item.children = formatMenu(node.children);
            }
            return item;
        });
    };

    // Filter category tree to only show the relevant branch
    const findCategoryBranch = (cats, targetId) => {
        for (const cat of cats) {
            if (cat.category_id.toString() === targetId) return true;
            if (cat.children && cat.children.length > 0) {
                if (findCategoryBranch(cat.children, targetId)) return true;
            }
        }
        return false;
    };

    const getFilteredCategories = () => {
        if (!currentCategoryId) return categories;

        for (const topCat of categories) {
            if (findCategoryBranch([topCat], currentCategoryId)) {
                return [topCat];
            }
        }
        return categories;
    };

    const displayCategories = getFilteredCategories();
    // Tự động mở menu cha nếu đang ở trong menu con
    const openKeys = displayCategories.map(cat => cat.category_id.toString());

    const handleCategoryClick = ({ key }) => {
        // Cập nhật URL path thay vì query param cho category để đẹp hơn
        const params = new URLSearchParams(searchParams);
        params.delete('category_id'); // Xoá query param nếu có
        navigate(`/category/${key}?${params.toString()}`);
    };

    const handleBrandChange = (brandId) => {
        const newParams = new URLSearchParams(searchParams);
        if (currentBrandId === brandId.toString()) {
            newParams.delete('brand_id'); // Toggle off
        } else {
            newParams.set('brand_id', brandId);
        }
        setSearchParams(newParams);
    };

    const handlePriceChange = (value) => {
        setPriceRange(value);
    };

    const handlePriceAfterChange = (value) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('minPrice', value[0]);
        newParams.set('maxPrice', value[1]);
        setSearchParams(newParams);
    };

    const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <Sider width={260} className="product-sidebar" theme="light">
            <div className="filter-section">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}><Spin /></div>
                ) : (
                    <Menu
                        mode="inline"
                        selectedKeys={[currentCategoryId]}
                        defaultOpenKeys={openKeys}
                        onClick={handleCategoryClick}
                        items={formatMenu(displayCategories)}
                        className="category-menu"
                    />
                )}
            </div>

            <div className="filter-section">
                <Title level={5} className="filter-title">Thương hiệu</Title>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}><Spin /></div>
                ) : (
                    <div className="brand-grid">
                        {brands.map(brand => (
                            <div 
                                key={brand.brand_id} 
                                className={`brand-item ${currentBrandId === brand.brand_id.toString() ? 'active' : ''}`}
                                onClick={() => handleBrandChange(brand.brand_id)}
                                title={brand.brand_name}
                            >
                                {brand.brand_logo ? (
                                    <img src={`http://localhost:5000/uploads/${brand.brand_logo}`} alt={brand.brand_name} />
                                ) : (
                                    <span>{brand.brand_name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="filter-section">
                <Title level={5} className="filter-title">Mức giá</Title>
                <div style={{ padding: '0 8px' }}>
                    <Slider
                        range
                        min={0}
                        max={10000000}
                        step={50000}
                        value={priceRange}
                        onChange={handlePriceChange}
                        onAfterChange={handlePriceAfterChange}
                        tooltip={{ formatter: formatPrice }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{formatPrice(priceRange[0])}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{formatPrice(priceRange[1])}</Text>
                    </div>
                </div>
            </div>
        </Sider>
    );
};

export default ProductSidebarFilter;
