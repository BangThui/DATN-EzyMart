import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  Typography,
  Space,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { supplierService } from "../../../services/supplierService";
import "../Admin.css";

const { Title, Text } = Typography;

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supplierService.getAll();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách NCC:", err);
      message.error("Không thể tải danh sách nhà cung cấp!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleOpenEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue({
      supplier_name: record.supplier_name,
      supplier_phone: record.supplier_phone || "",
      supplier_email: record.supplier_email || "",
      supplier_address: record.supplier_address || "",
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingSupplier(null);
  };

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.supplier_id, values);
        message.success("Cập nhật nhà cung cấp thành công!");
      } else {
        await supplierService.create(values);
        message.success("Thêm nhà cung cấp thành công!");
      }
      handleCancel();
      fetchSuppliers();
    } catch (err) {
      console.error("Lỗi lưu NCC:", err);
      const errorMsg =
        err?.response?.data?.error ||
        (editingSupplier ? "Lỗi khi cập nhật!" : "Lỗi khi thêm mới!");
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await supplierService.remove(id);
      message.success("Đã xóa nhà cung cấp!");
      fetchSuppliers();
    } catch (err) {
      console.error("Lỗi xóa NCC:", err);
      const errorMsg = err?.response?.data?.error || "Lỗi khi xóa nhà cung cấp!";
      message.error(errorMsg);
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "supplier_id",
      key: "supplier_id",
      width: 60,
      render: (text) => <Text type="secondary">#{text}</Text>,
    },
    {
      title: "Tên nhà cung cấp",
      dataIndex: "supplier_name",
      key: "supplier_name",
      render: (text) => (
        <Space>
          <ShopOutlined className="admin-icon-success" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "supplier_phone",
      key: "supplier_phone",
      render: (text) =>
        text ? (
          <Tag color="blue">{text}</Tag>
        ) : (
          <Text type="secondary">---</Text>
        ),
    },
    {
      title: "Email",
      dataIndex: "supplier_email",
      key: "supplier_email",
      render: (text) => text || <Text type="secondary">---</Text>,
    },
    {
      title: "Địa chỉ",
      dataIndex: "supplier_address",
      key: "supplier_address",
      ellipsis: true,
      render: (text) => text || <Text type="secondary">---</Text>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa nhà cung cấp"
            description={`Bạn chắc chắn muốn xóa "${record.supplier_name}"?`}
            onConfirm={() => handleDelete(record.supplier_id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-stock-page">
      <div className="admin-page-header">
        <Title level={2}>🏭 Quản lý Nhà Cung Cấp</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          className="admin-btn-primary"
        >
          Thêm nhà cung cấp
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="supplier_id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          locale: { items_per_page: '/ trang' },
          showTotal: (total) => `Tổng ${total} nhà cung cấp`,
        }}
        locale={{ emptyText: "Chưa có nhà cung cấp nào" }}
      />

      <Modal
        title={
          editingSupplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp mới"
        }
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="supplier_name"
            label="Tên nhà cung cấp"
            rules={[
              { required: true, message: "Vui lòng nhập tên nhà cung cấp" },
              { max: 255, message: "Tên không được vượt quá 255 ký tự" },
            ]}
          >
            <Input placeholder="VD: Công ty TNHH XYZ" />
          </Form.Item>

          <Form.Item
            name="supplier_phone"
            label="Số điện thoại"
            rules={[
              {
                pattern: /^[0-9\s\-\+\(\)]{7,20}$/,
                message: "Số điện thoại không hợp lệ",
              },
            ]}
          >
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
            <Input.TextArea
              rows={2}
              placeholder="VD: 123 Đường Lê Lợi, Quận 1, TP.HCM"
            />
          </Form.Item>

          <div className="admin-form-actions admin-form-actions--mt">
            <Button onClick={handleCancel} disabled={submitting}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="admin-btn-primary"
            >
              {editingSupplier ? "Lưu thay đổi" : "Thêm mới"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminSuppliers;
