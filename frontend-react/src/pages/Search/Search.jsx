import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Typography, Spin, Empty } from 'antd';
import ProductCard from '../../components/product/ProductCard';
import { productService } from '../../services/productService';
import './Search.css';

const { Title, Text } = Typography;

const Search = () => {
    const [searchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const hot = searchParams.get('hot');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!q && !hot) return;
        setLoading(true);
        
        const fetchPromise = hot 
            ? productService.getAll({ hot: 1 })
            : productService.search(q);
            
        fetchPromise.then(data => {
            setProducts(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [q, hot]);

    const titleText = hot ? (
        <>Danh sách <Text className="search-keyword">Sản Phẩm Bán Chạy</Text></>
    ) : (
        <>Kết quả tìm kiếm: <Text className="search-keyword">"{q}"</Text></>
    );

    return (
        <div className="search-page-wrap">
            <Title level={3}>
                {titleText}
                {!loading && <Text className="search-count" type="secondary">({products.length} sản phẩm)</Text>}
            </Title>

            {loading ? (
                <div className="search-loading"><Spin size="large" /></div>
            ) : products.length === 0 ? (
                <Empty description={hot ? "Không có sản phẩm bán chạy nào" : `Không tìm thấy sản phẩm nào với từ khóa "${q}"`} />
            ) : (
                <Row gutter={[24, 32]}>
                    {products.map(p => (
                        <Col xs={24} sm={12} md={8} lg={6} key={p.product_id}>
                            <ProductCard product={p} />
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default Search;
