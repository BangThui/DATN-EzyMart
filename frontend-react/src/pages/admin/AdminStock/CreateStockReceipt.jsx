import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Typography,
  Space,
  Row,
  Col,
  Card,
  Image,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  InboxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { stockService } from "../../../services/stockService";
import { supplierService } from "../../../services/supplierService";
import { productService } from "../../../services/productService";
import { formatCurrency } from "../../../utils";
import { getImageUrl } from "../../../utils/imageHelper";
import "../Admin.css";

const { Title, Text } = Typography;

// Badge trạng thái tồn kho hiện tại
const StockBadge = ({ qty }) => {
  const num = Number(qty);
  if (num === 0) {
    return (
      <Tag icon={<StopOutlined />} color="error" className="admin-tag-status">
        Hết hàng ({num})
      </Tag>
    );
  }
  if (num < 10) {
    return (
      <Tag icon={<WarningOutlined />} color="warning" className="admin-tag-status">
        Sắp hết ({num})
      </Tag>
    );
  }
  return (
    <Tag icon={<CheckCircleOutlined />} color="success" className="admin-tag-status">
      Còn hàng ({num})
    </Tag>
  );
};

const CreateStockReceipt = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const preSelectedVariants = location.state?.preSelectedVariants || [];

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState(null);
  const [note, setNote] = useState("");
  const [dataSource, setDataSource] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // 1. Tải danh sách nhà cung cấp
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await supplierService.getAll();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lỗi lấy nhà cung cấp:", error);
        message.error("Không thể tải danh sách nhà cung cấp!");
      }
    };
    fetchSuppliers();
  }, []);

  // 1b. Tải danh sách sản phẩm phục vụ tìm kiếm thêm sản phẩm thủ công
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const data = await productService.getAll({ admin: true });
        setAllProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lỗi lấy sản phẩm:", error);
      }
    };
    fetchAllProducts();
  }, []);

  // Handler khi chọn thêm biến thể thủ công từ select search
  const handleSelectNewVariant = (value) => {
    // Kiểm tra xem đã tồn tại trong dataSource chưa
    const existing = dataSource.find((item) => item.variant_id === value);
    if (existing) {
      message.info(`Đã có "${existing.product_name} - ${existing.variant_name}" trong danh sách, tăng số lượng thêm 1!`);
      handleCellChange(value, "quantity", (existing.quantity || 0) + 1);
      return;
    }

    // Tìm trong allProducts
    const product = allProducts.find((p) => p.variants?.some((v) => v.variant_id === value));
    if (!product) return;
    const variant = product.variants.find((v) => v.variant_id === value);
    if (!variant) return;

    const newItem = {
      key: variant.variant_id,
      variant_id: variant.variant_id,
      product_name: product.product_name,
      variant_name: variant.variant_name || "---",
      sku: variant.sku || "---",
      product_image: product.product_image,
      variant_price: variant.variant_price || 0,
      variant_quantity: variant.variant_quantity || 0,
      quantity: 1,
      import_price: Math.round((variant.variant_price || 0) * 0.6),
    };

    setDataSource((prev) => [...prev, newItem]);
    message.success(`Đã thêm "${product.product_name} - ${variant.variant_name}" vào danh sách!`);
  };

  // 2. Gọi API lấy thông tin chi tiết các biến thể đã chọn qua state truyền sang
  useEffect(() => {
    if (preSelectedVariants && preSelectedVariants.length > 0) {
      const fetchSelectedDetails = async () => {
        setLoading(true);
        try {
          // Gọi API POST /api/products/get-details-by-variants
          const response = await productService.getDetailsByVariants(preSelectedVariants);
          const formattedItems = response.map((item) => ({
            key: item.variant_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name || "---",
            sku: item.sku || "---",
            product_image: item.product_image,
            variant_price: item.variant_price || 0,
            variant_quantity: item.variant_quantity || 0,
            quantity: 1, // Mặc định số lượng nhập bằng 1
            import_price: Math.round((item.variant_price || 0) * 0.6), // Tự gợi ý giá nhập bằng 60% giá bán lẻ
          }));
          setDataSource(formattedItems);
        } catch (error) {
          console.error("Lỗi lấy chi tiết biến thể:", error);
          message.error("Lỗi khi tải chi tiết các sản phẩm tích chọn!");
        } finally {
          setLoading(false);
        }
      };
      fetchSelectedDetails();
    }
  }, [preSelectedVariants]);

  // 3. Cập nhật các ô Editable cell trực tiếp trên dòng
  const handleCellChange = (key, field, value) => {
    setDataSource((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  // 4. Xử lý xóa bớt dòng sản phẩm trong bảng nhập kho
  const handleDeleteRow = (key) => {
    setDataSource((prev) => prev.filter((row) => row.key !== key));
  };

  // 5. Gửi yêu cầu lưu phiếu nhập kho hàng loạt
  const handleSubmit = async () => {
    if (!supplierId) {
      message.error("Vui lòng chọn nhà cung cấp cho phiếu nhập kho!");
      return;
    }

    if (dataSource.length === 0) {
      message.error("Không có sản phẩm nào trong phiếu nhập kho!");
      return;
    }

    // Kiểm tra tính hợp lệ của số lượng và giá nhập
    const invalidItem = dataSource.find(
      (item) => !item.quantity || Number(item.quantity) <= 0 || Number(item.import_price) < 0
    );
    if (invalidItem) {
      message.error(
        `Vui lòng nhập đúng Số lượng nhập (>0) và Giá nhập (>=0) cho sản phẩm "${invalidItem.product_name}"`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId || null,
        note: note || null,
        items: dataSource.map((item) => ({
          variant_id: item.variant_id,
          quantity: Number(item.quantity),
          import_price: Number(item.import_price),
        })),
      };

      const res = await stockService.bulkImportStock(payload);
      message.success(res?.message || "Nhập kho hàng loạt thành công!");
      // Chuyển hướng về trang danh sách phiếu nhập kho
      navigate("/admin/stock");
    } catch (error) {
      console.error("Lỗi khi gửi phiếu nhập:", error);
      message.error(
        error?.response?.data?.error || "Giao dịch thất bại! Đã xảy ra lỗi trên Server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Tính tổng tiền phiếu nhập
  const totalCost = dataSource.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.import_price || 0),
    0
  );

  return (
    <div className="admin-create-stock-receipt">
      {/* Header */}
      <div className="admin-page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ fontWeight: 600 }}
          >
            Quay lại
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            📦 Tạo Phiếu Nhập Kho Hàng Loạt
          </Title>
        </Space>
      </div>

      <Row gutter={24}>
        {/* Cột trái: Bảng sản phẩm nhập */}
        <Col span={17}>
          <Card
            title={
              <span>
                <InboxOutlined style={{ color: "#fa8c16", marginRight: 8 }} />
                Danh sách biến thể nhập kho
              </span>
            }
            bordered={false}
            className="admin-card-shadow"
            style={{ marginBottom: 24 }}
          >
            <Select
              showSearch
              placeholder="🔍 Tìm chọn sản phẩm / biến thể cần thêm..."
              style={{ width: "100%", marginBottom: 16 }}
              optionFilterProp="label"
              value={null}
              onChange={handleSelectNewVariant}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={allProducts.flatMap((p) =>
                p.variants?.map((v) => ({
                  label: `${p.product_name} – ${v.variant_name || "Mặc định"} (Hiện có: ${v.variant_quantity})`,
                  value: v.variant_id,
                })) || []
              )}
            />
            <Table
              dataSource={dataSource}
              loading={loading}
              rowKey="key"
              size="small"
              pagination={false}
              locale={{ emptyText: "Phiếu nhập kho đang trống. Hãy tìm chọn sản phẩm từ ô tìm kiếm phía trên!" }}
              columns={[
                {
                  title: "Ảnh",
                  dataIndex: "product_image",
                  width: 65,
                  render: (img) => (
                    <Image
                      src={getImageUrl(img)}
                      fallback="/placeholder.png"
                      width={45}
                      height={45}
                      style={{ borderRadius: 6, objectFit: "cover" }}
                    />
                  ),
                },
                {
                  title: "Sản phẩm & Biến thể",
                  key: "product_info",
                  render: (_, record) => (
                    <div>
                      <Text strong style={{ fontSize: 13, color: "#1f2937" }}>
                        {record.product_name}
                      </Text>
                      <div style={{ marginTop: 2 }}>
                        <Tag color="purple" style={{ fontSize: 11 }}>
                          {record.variant_name}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          SKU: {record.sku}
                        </Text>
                      </div>
                    </div>
                  ),
                },
                {
                  title: "Tồn kho hiện tại",
                  dataIndex: "variant_quantity",
                  width: 120,
                  align: "center",
                  render: (qty) => <StockBadge qty={qty} />,
                },
                {
                  title: "Số lượng nhập",
                  key: "quantity",
                  width: 120,
                  align: "center",
                  render: (_, record) => (
                    <InputNumber
                      min={1}
                      value={record.quantity}
                      onChange={(val) => handleCellChange(record.key, "quantity", val)}
                      style={{ width: 90 }}
                    />
                  ),
                },
                {
                  title: "Giá nhập (₫)",
                  key: "import_price",
                  width: 155,
                  align: "right",
                  render: (_, record) => (
                    <InputNumber
                      min={0}
                      step={1000}
                      value={record.import_price}
                      onChange={(val) => handleCellChange(record.key, "import_price", val)}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => value.replace(/,*/g, "")}
                      style={{ width: 125 }}
                    />
                  ),
                },
                {
                  title: "Thành tiền",
                  key: "total_cost",
                  width: 125,
                  align: "right",
                  render: (_, record) => (
                    <Text strong style={{ color: "#16a34a" }}>
                      {formatCurrency(Number(record.quantity || 0) * Number(record.import_price || 0))}
                    </Text>
                  ),
                },
                {
                  title: "Xóa",
                  key: "delete",
                  width: 60,
                  align: "center",
                  render: (_, record) => (
                    <Button
                      type="text"
                      danger
                      onClick={() => handleDeleteRow(record.key)}
                      style={{ padding: 0 }}
                    >
                      Xóa
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Cột phải: Thông tin phiếu nhập */}
        <Col span={7}>
          <Card
            title="Thông tin phiếu nhập"
            bordered={false}
            className="admin-card-shadow"
          >
            <Form layout="vertical">
              <Form.Item required label={<strong style={{ color: "#374151" }}>Nhà cung cấp</strong>}>
                <Select
                  showSearch
                  placeholder="Chọn nhà cung cấp"
                  optionFilterProp="label"
                  allowClear
                  value={supplierId}
                  onChange={(val) => setSupplierId(val)}
                  style={{ width: "100%" }}
                  options={suppliers.map((s) => ({
                    label: s.supplier_name,
                    value: s.supplier_id,
                  }))}
                />
              </Form.Item>

              <Form.Item label={<strong style={{ color: "#374151" }}>Ghi chú phiếu nhập</strong>}>
                <Input.TextArea
                  placeholder="Điền ghi chú cho phiếu nhập..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                />
              </Form.Item>

              <div
                style={{
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "between", marginBottom: 8 }}>
                  <Text type="secondary">Số lượng loại sản phẩm:</Text>
                  <Text strong>{dataSource.length}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "between", fontSize: 16 }}>
                  <Text strong>Tổng tiền nhập:</Text>
                  <Text strong type="danger" style={{ fontSize: 18 }}>
                    {formatCurrency(totalCost)}
                  </Text>
                </div>
              </div>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                disabled={dataSource.length === 0}
                onClick={handleSubmit}
                block
                className="admin-btn-primary"
                style={{ height: 40, background: "#fa8c16", borderColor: "#fa8c16" }}
              >
                Hoàn tất nhập kho
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateStockReceipt;
