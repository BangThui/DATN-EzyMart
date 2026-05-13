import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Space,
  Popconfirm,
  message,
  Select,
  List,
  Tag,
  Badge,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { categoryService } from "../../../services/categoryService";
import "../Admin.css";

const { Title, Text } = Typography;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(data || []);
    } catch {
      message.error("Lỗi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Chỉ lấy danh mục cha để hiện ở bảng chính
  const parentCategories = categories.filter(c => !c.parent_id);

  // Lấy danh mục con theo id cha
  const getChildren = parentId =>
    categories.filter(c => c.parent_id === parentId);

  // Mở modal thêm mới (không có cha)
  const openAdd = () => {
    setEditingRecord(null);
    setIsAddingSub(false);
    form.resetFields();
    setModalVisible(true);
  };

  // Mở modal thêm danh mục con, tự điền sẵn parent_id
  const openAddChild = parentId => {
    setEditingRecord(null);
    setIsAddingSub(true);
    form.resetFields();
    form.setFieldsValue({ parent_id: parentId });
    setModalVisible(true);
  };

  // Mở modal sửa
  const openEdit = record => {
    setEditingRecord(record);
    setIsAddingSub(false);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async id => {
    try {
      await categoryService.delete(id);
      message.success("Đã xóa danh mục");
      fetchData();
    } catch {
      message.error("Xóa thất bại");
    }
  };

  const handleSubmit = async values => {
    setSaving(true);
    try {
      if (editingRecord) {
        await categoryService.update(editingRecord.category_id, values);
        message.success("Cập nhật thành công");
      } else {
        await categoryService.create(values);
        message.success("Thêm danh mục thành công");
      }
      setModalVisible(false);
      fetchData();
    } catch {
      message.error("Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Cột bảng chính (chỉ hiện danh mục cha)
  const columns = [
    { title: "ID", dataIndex: "category_id", width: 80 },
    {
      title: "Tên danh mục",
      render: (_, r) => {
        const count = getChildren(r.category_id).length;
        return (
          <Space size={16} align="center">
            <span
              style={{ fontWeight: 600, fontSize: "15px", color: "#262626" }}
            >
              {r.category_name}
            </span>
            {count > 0 && (
              <Badge
                count={count}
                style={{
                  backgroundColor: "#e6f7ff",
                  color: "#1890ff",
                  fontSize: "11px",
                  fontWeight: 600,
                  boxShadow: "none",
                  transform: "scale(0.85)",
                  marginTop: "-2px",
                }}
              />
            )}
          </Space>
        );
      },
    },
    {
      title: "Thao tác",
      width: 200,
      render: (_, r) => (
        <Space>
          <Tooltip title="Thêm danh mục con">
            <Button
              icon={<PlusOutlined />}
              size="small"
              style={{ color: "#16a34a", borderColor: "#16a34a" }}
              onClick={e => {
                e.stopPropagation();
                openAddChild(r.category_id);
              }}
            />
          </Tooltip>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={e => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa danh mục này?"
            onConfirm={() => handleDelete(r.category_id)}
            okText="Xóa"
            cancelText="Hủy"
            onPopupClick={e => e.stopPropagation()}
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={e => e.stopPropagation()}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Vùng mở rộng: Danh sách danh mục con
  const expandedRowRender = parentRecord => {
    const children = getChildren(parentRecord.category_id);
    return (
      <div className="admin-expanded-row">
        {children.length > 0 ? (
          <List
            size="small"
            dataSource={children}
            renderItem={child => (
              <List.Item
                className="admin-child-item"
                actions={[
                  <Button
                    key="edit"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => openEdit(child)}
                  >
                    Sửa
                  </Button>,
                  <Popconfirm
                    key="del"
                    title="Xóa danh mục con này?"
                    onConfirm={() => handleDelete(child.category_id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button icon={<DeleteOutlined />} size="small" danger>
                      Xóa
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Space align="center" size={12}>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, minWidth: "40px" }}
                  >
                    ID: {child.category_id}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 400 }}>
                    {child.category_name}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Text type="secondary">Chưa có danh mục con nào.</Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page-header">
        <Title level={2}>📁 Quản lý danh mục</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
          className="admin-btn-primary"
        >
          Thêm danh mục
        </Button>
      </div>

      <Table
        dataSource={parentCategories}
        columns={columns}
        loading={loading}
        rowKey="category_id"
        pagination={{ pageSize: 10 }}
        rowClassName={() => "admin-pointer"}
        expandable={{
          expandRowByClick: true,
          expandedRowKeys,
          onExpand: (expanded, record) => {
            setExpandedRowKeys(
              expanded
                ? [...expandedRowKeys, record.category_id]
                : expandedRowKeys.filter(k => k !== record.category_id),
            );
          },
          expandedRowRender,
          // Cho phép mở rộng tất cả danh mục cha
          rowExpandable: () => true,
          // Icon mũi tên tùy chỉnh nằm ngoài cùng bên phải
          expandIcon: ({ expanded, onExpand, record, expandable }) => {
            if (!expandable) return null;
            return (
              <Button
                type="text"
                size="small"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  onExpand(record, e);
                }}
              />
            );
          },
          expandIconColumnIndex: columns.length, // Đẩy icon sang cột cuối cùng
        }}
      />

      <Modal
        title={
          editingRecord
            ? "Cập nhật danh mục"
            : isAddingSub
              ? "Thêm danh mục con"
              : "Thêm danh mục"
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setIsAddingSub(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={isAddingSub ? "Tên danh mục con" : "Tên danh mục"}
            name="category_name"
            rules={[{ required: true, message: "Vui lòng nhập tên danh mục!" }]}
          >
            <Input
              placeholder={
                isAddingSub
                  ? "Nhập tên danh mục con..."
                  : "Nhập tên danh mục..."
              }
            />
          </Form.Item>
          <Form.Item label="Danh mục cha" name="parent_id">
            <Select
              allowClear
              placeholder="Để trống nếu là danh mục gốc"
              disabled={isAddingSub}
            >
              {parentCategories
                .filter(c => c.category_id !== editingRecord?.category_id)
                .map(c => (
                  <Select.Option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <div className="admin-form-actions">
            <Button onClick={() => setModalVisible(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              className="admin-btn-primary"
            >
              {editingRecord ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;
