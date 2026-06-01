import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Tooltip,
  DatePicker,
  Card,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  MinusCircleOutlined,
  EyeOutlined,
  PlusCircleOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { stockService } from "../../../services/stockService";
import { supplierService } from "../../../services/supplierService";
import { productService } from "../../../services/productService";
import dayjs from "dayjs";
import "../Admin.css";
import "./AdminStock.css";

const { Title, Text } = Typography;
const { Option } = Select;

const AdminStock = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [quickAddForm] = Form.useForm();

  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs()
  ]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format("YYYY-MM-DD");
        params.endDate = dateRange[1].format("YYYY-MM-DD");
      }
      const data = await stockService.getAll(params);
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

  const fetchSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy nhà cung cấp:", error);
      message.error("Không thể tải danh sách nhà cung cấp!");
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

  const handleExportGoodsReceipt = () => {
    if (!receipts || receipts.length === 0) {
      message.warning("Không có dữ liệu phiếu nhập để xuất!");
      return;
    }

    const excelData = receipts.map((item, index) => ({
      "STT": index + 1,
      "Mã phiếu nhập": item.receipt_id,
      "Nhà cung cấp": item.supplier_name || "---",
      "Tổng tiền nhập": Number(item.total_cost || 0).toLocaleString("vi-VN"),
      "Số sản phẩm": item.item_count || 0,
      "Ngày nhập kho": dayjs(item.created_at).format("DD/MM/YYYY HH:mm"),
      "Trạng thái": item.status || "Hoàn thành",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const wscols = [
      { wch: 5 },  
      { wch: 15 }, 
      { wch: 25 }, 
      { wch: 20 }, 
      { wch: 15 }, 
      { wch: 20 }, 
      { wch: 15 }, 
    ];
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nhập Kho");

    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    const dateString = `${day}_${month}_${year}`;

    const fileName = `Nhat_ky_nhap_kho_EzyMart_${dateString}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // === Quick Add Supplier ===
  const handleOpenQuickAdd = () => {
    quickAddForm.resetFields();
    setQuickAddModalVisible(true);
  };

  const handleQuickAddCancel = () => {
    setQuickAddModalVisible(false);
    quickAddForm.resetFields();
  };

  const handleQuickAddFinish = async (values) => {
    setQuickAddSubmitting(true);
    try {
      const result = await supplierService.create(values);
      message.success(`Đã thêm nhà cung cấp "${values.supplier_name}"!`);
      // Refresh danh sách và tự chọn NCC vừa thêm
      await fetchSuppliers();
      form.setFieldValue("supplier_id", result.supplier_id);
      setQuickAddModalVisible(false);
      quickAddForm.resetFields();
    } catch (err) {
      console.error("Lỗi thêm NCC nhanh:", err);
      message.error(err?.response?.data?.error || "Lỗi khi thêm nhà cung cấp!");
    } finally {
      setQuickAddSubmitting(false);
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
      render: (text) => text || <Text type="secondary">---</Text>,
    },
    {
      title: "Người tạo phiếu",
      dataIndex: "creator_name",
      key: "creator_name",
      render: (text) => <span className="font-medium text-gray-700">{text || "---"}</span>,
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
      render: (text) => text || <Text type="secondary">---</Text>,
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

  const totalAllAmount = receipts.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
  const totalElements = receipts.length;

  return (
    <div className="admin-stock-page">
      <div className="admin-page-header">
        <Title level={2}>📦 Quản lý Nhập Kho</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/admin/stock/create")}
          className="admin-btn-primary"
        >
          Tạo Phiếu Nhập Mới
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <DatePicker.RangePicker 
            value={dateRange} 
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExportGoodsReceipt}
            style={{ backgroundColor: '#107c41', borderColor: '#107c41' }}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card bordered={false} className="admin-statistic-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Tổng tiền nhập kho"
              value={totalAllAmount}
              valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
              suffix="đ"
              formatter={(val) => new Intl.NumberFormat("vi-VN").format(val)}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} className="admin-statistic-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Tổng số phiếu nhập"
              value={totalElements}
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
              suffix="phiếu"
              formatter={(val) => new Intl.NumberFormat("vi-VN").format(val)}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={receipts}
        rowKey="receipt_id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          locale: { items_per_page: '/ trang' },
          showTotal: (total) => `Tổng ${total} phiếu nhập`,
        }}
      />



      {/* === Modal Quick Add Nhà Cung Cấp === */}
      <Modal
        title="➕ Thêm nhanh nhà cung cấp"
        open={quickAddModalVisible}
        onCancel={handleQuickAddCancel}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={quickAddForm} layout="vertical" onFinish={handleQuickAddFinish}>
          <Form.Item
            name="supplier_name"
            label="Tên nhà cung cấp"
            rules={[{ required: true, message: "Vui lòng nhập tên nhà cung cấp" }]}
          >
            <Input placeholder="VD: Công ty TNHH XYZ" autoFocus />
          </Form.Item>
          <Form.Item name="supplier_phone" label="Số điện thoại">
            <Input placeholder="VD: 0901234567" />
          </Form.Item>
          <Form.Item
            name="supplier_email"
            label="Email"
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="VD: contact@supplier.com" />
          </Form.Item>
          <Form.Item name="supplier_address" label="Địa chỉ">
            <Input placeholder="VD: 123 Lê Lợi, Q.1, TP.HCM" />
          </Form.Item>
          <div className="admin-form-actions admin-form-actions--mt">
            <Button onClick={handleQuickAddCancel} disabled={quickAddSubmitting}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={quickAddSubmitting}
              className="admin-btn-primary"
            >
              Thêm & Chọn
            </Button>
          </div>
        </Form>
      </Modal>

      {/* === Modal Chi Tiết Phiếu Nhập === */}
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
                <Text strong>Nhà cung cấp:</Text>{" "}
                {currentReceipt.supplier_name || <Text type="secondary">---</Text>}
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
