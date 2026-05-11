import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Typography,
  Space,
  Row,
  Col,
} from "antd";
import { PlusOutlined, MinusCircleOutlined, EyeOutlined } from "@ant-design/icons";
import { stockService } from "../../../services/stockService";
import { productService } from "../../../services/productService";
import dayjs from "dayjs";
import "../Admin.css";

const { Title, Text } = Typography;
const { Option } = Select;

const AdminStock = () => {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await stockService.getAll();
      setReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy phiếu nhập:", error);
      message.error("Lỗi khi tải danh sách phiếu nhập!");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productService.getAll({ admin: true });
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm:", error);
    }
  };

  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({
      items: [{ variant_id: null, quantity: 1, import_price: 0 }],
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleFinish = async (values) => {
    try {
      // Validate items
      if (!values.items || values.items.length === 0) {
        message.error("Vui lòng thêm ít nhất một sản phẩm để nhập kho");
        return;
      }

      await stockService.importStock(values);
      message.success("Tạo phiếu nhập kho thành công!");
      handleCancel();
      fetchData();
    } catch (error) {
      console.error("Lỗi tạo phiếu nhập:", error);
      message.error(error?.response?.data?.error || "Lỗi khi tạo phiếu nhập kho!");
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const data = await stockService.getById(id);
      setCurrentReceipt(data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error("Lỗi lấy chi tiết phiếu nhập:", error);
      message.error("Lỗi khi tải chi tiết phiếu nhập!");
    }
  };

  const columns = [
    {
      title: "Mã phiếu",
      dataIndex: "receipt_id",
      key: "receipt_id",
      width: 100,
      render: (text) => <b>#{text}</b>,
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplier_name",
      key: "supplier_name",
      render: (text) => text || "---",
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_cost",
      key: "total_cost",
      render: (val) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
          val || 0
        ),
    },
    {
      title: "Số loại SP",
      dataIndex: "item_count",
      key: "item_count",
      width: 120,
    },
    {
      title: "Ngày nhập",
      dataIndex: "created_at",
      key: "created_at",
      render: (val) => dayjs(val).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (text) => text || "---",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetail(record.receipt_id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, record) => (
        <div>
          <Text strong>{record.product_name}</Text>
          <br />
          <Text type="secondary" className="admin-text-secondary-sm">
            {record.variant_name || "---"}
          </Text>
        </div>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
    },
    {
      title: "Giá nhập",
      dataIndex: "import_price",
      key: "import_price",
      render: (val) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
          val || 0
        ),
    },
    {
      title: "Thành tiền",
      key: "total",
      render: (_, record) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
          record.quantity * record.import_price
        ),
    },
  ];

  return (
    <div className="admin-stock-page">
      <div className="admin-page-header">
        <Title level={2}>📦 Quản lý Nhập Kho</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
          className="admin-btn-primary"
        >
          Tạo Phiếu Nhập Mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={receipts}
        rowKey="receipt_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Tạo Phiếu Nhập Kho Mới"
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier_name" label="Nhà cung cấp">
                <Input placeholder="Nhập tên nhà cung cấp (tuỳ chọn)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="note" label="Ghi chú">
                <Input placeholder="Ghi chú phiếu nhập (tuỳ chọn)" />
              </Form.Item>
            </Col>
          </Row>

          <div className="admin-section-label">
            <Text strong>Danh sách sản phẩm nhập:</Text>
          </div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    className="admin-stock-item-row"
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "variant_id"]}
                      rules={[{ required: true, message: "Chọn biến thể SP" }]}
                      className="admin-fi-variant-select"
                    >
                      <Select
                        showSearch
                        placeholder="Tìm chọn biến thể sản phẩm"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={products.flatMap((p) =>
                          p.variants?.map((v) => ({
                            label: `${p.product_name} - ${
                              v.variant_name || "---"
                            } (Hiện tại: ${v.variant_quantity})`,
                            value: v.variant_id,
                          })) || []
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "quantity"]}
                      rules={[{ required: true, message: "Nhập SL" }]}
                    >
                      <InputNumber min={1} placeholder="Số lượng" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "import_price"]}
                      rules={[{ required: true, message: "Nhập giá" }]}
                    >
                      <InputNumber
                        min={0}
                        step={1000}
                        placeholder="Giá nhập"
                        className="admin-input-import-price"
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} className="admin-remove-icon" />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm dòng sản phẩm
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div className="admin-form-actions admin-form-actions--mt">
            <Button onClick={handleCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="admin-btn-primary">
              Hoàn tất phiếu nhập
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={
          currentReceipt ? `Chi tiết phiếu nhập #${currentReceipt.receipt_id}` : "Chi tiết"
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {currentReceipt && (
          <div>
            <div className="admin-receipt-info">
              <p>
                <Text strong>Nhà cung cấp:</Text> {currentReceipt.supplier_name || "---"}
              </p>
              <p>
                <Text strong>Ngày nhập:</Text>{" "}
                {dayjs(currentReceipt.created_at).format("DD/MM/YYYY HH:mm")}
              </p>
              <p>
                <Text strong>Ghi chú:</Text> {currentReceipt.note || "---"}
              </p>
              <p>
                <Text strong>Tổng tiền phiếu nhập:</Text>{" "}
                <Text type="danger" strong>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(currentReceipt.total_cost || 0)}
                </Text>
              </p>
            </div>
            <Table
              columns={detailColumns}
              dataSource={currentReceipt.details || []}
              rowKey="detail_id"
              pagination={false}
              size="small"
              bordered
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminStock;
