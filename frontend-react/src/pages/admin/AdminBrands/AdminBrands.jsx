import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Popconfirm,
  Image,
  TreeSelect,
  Tag,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { brandService } from "../../../services/brandService";
import { categoryService } from "../../../services/categoryService";
import { Typography } from "antd";
import { buildCategoryTree } from "../../../utils";
import { getImageUrl } from "../../../utils/imageHelper";
import "../Admin.css";

const { Title, Text } = Typography;

// const UPLOAD_BASE = "http://localhost:5000/uploads/"; // Replaced by getImageUrl

const AdminBrands = () => {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCategory ? { category_id: selectedCategory } : {};
      const [brandsData, categoriesData] = await Promise.all([
        brandService.getAll(params),
        categoryService.getAll(),
      ]);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Fetch brands/categories error:", error);
      message.error("Lỗi khi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    setEditingBrand(record);
    if (record) {
      form.setFieldsValue({
        brand_name: record.brand_name,
        category_ids: record.category_ids || [],
      });
      if (record.brand_logo) {
        setFileList([
          {
            uid: "-1",
            name: record.brand_logo,
            status: "done",
            url: getImageUrl(record.brand_logo),
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      form.resetFields();
      setFileList([]);
    }
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  const handleDelete = async id => {
    try {
      await brandService.delete(id);
      message.success("Xóa thương hiệu thành công!");
      fetchData();
    } catch (error) {
      console.error("Delete brand error:", error);
      message.error(error.response?.data?.error || "Lỗi khi xóa thương hiệu!");
    }
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleFinish = async values => {
    try {
      const formData = new FormData();
      formData.append("brand_name", values.brand_name);
      if (values.category_ids) {
        formData.append("category_ids", JSON.stringify(values.category_ids));
      }
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("brand_logo", fileList[0].originFileObj);
      }

      if (editingBrand) {
        await brandService.update(editingBrand.brand_id, formData);
        message.success("Cập nhật thương hiệu thành công!");
      } else {
        await brandService.create(formData);
        message.success("Thêm thương hiệu mới thành công!");
      }
      handleCancel();
      fetchData();
    } catch (error) {
      console.error("Save brand error:", error);
      message.error(error.response?.data?.error || "Lỗi khi lưu thương hiệu!");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "brand_id",
      key: "brand_id",
      width: 80,
    },
    {
      title: "Tên Thương Hiệu",
      dataIndex: "brand_name",
      key: "brand_name",
    },
    {
      title: "Logo",
      dataIndex: "brand_logo",
      key: "brand_logo",
      render: text =>
        text ? (
          <Image
            src={getImageUrl(text)}
            alt="logo"
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
          />
        ) : (
          "Không có ảnh"
        ),
    },
    {
      title: "Danh Mục",
      dataIndex: "category_ids",
      key: "category_ids",
      render: catIds => {
        if (!Array.isArray(categories) || !Array.isArray(catIds) || catIds.length === 0) return "---";
        
        const tagColors = ['magenta', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
        
        const catObjects = catIds.map(id => {
          return categories.find(c => c.category_id === id);
        }).filter(Boolean);
        
        return catObjects.length > 0 ? (
          <Space size="small" wrap>
            {catObjects.map((cat, index) => (
              <Tag color={tagColors[cat.category_id % tagColors.length]} key={index}>
                {cat.category_name}
              </Tag>
            ))}
          </Space>
        ) : "---";
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa thương hiệu này?"
            onConfirm={() => handleDelete(record.brand_id)}
            okText="Xóa"
            cancelText="Hủy"
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
    <div
      style={{
        padding: 24,
        background: "#fff",
        minHeight: "100%",
        borderRadius: 8,
      }}
    >
      <div className="admin-page-header">
        <Title level={2}>🏷️ Quản lý Thương Hiệu</Title>
        <Space>
          <Select
            placeholder="Lọc theo Danh mục"
            allowClear
            style={{ width: 250, marginRight: 16 }}
            value={selectedCategory}
            onChange={(value) => setSelectedCategory(value)}
            options={buildCategoryTree(categories).map(parent => {
              if (parent.children && parent.children.length > 0) {
                return {
                  label: <strong style={{ color: "#333" }}>{parent.category_name}</strong>,
                  options: parent.children.map(child => ({
                    label: child.category_name,
                    value: child.category_id,
                  })),
                };
              }
              return {
                label: parent.category_name,
                value: parent.category_id,
              };
            })}
          />
          <Input.Search
            placeholder="Tìm kiếm thương hiệu..."
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
            className="admin-btn-primary"
          >
            Thêm Thương Hiệu
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={
          (brands || []).filter((b) =>
            b.brand_name.toLowerCase().includes(searchText.toLowerCase())
          )
        }
        rowKey="brand_id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          locale: { items_per_page: '/ trang' },
          showTotal: (total) => `Tổng ${total} thương hiệu`,
        }}
      />

      <Modal
        title={editingBrand ? "Cập nhật Thương Hiệu" : "Thêm Thương Hiệu"}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="brand_name"
            label="Tên Thương Hiệu"
            rules={[
              { required: true, message: "Vui lòng nhập tên thương hiệu!" },
            ]}
          >
            <Input placeholder="Nhập tên thương hiệu" />
          </Form.Item>

          <Form.Item name="category_ids" label="Danh Mục Liên Kết">
            <TreeSelect
              treeData={buildCategoryTree(categories, {
                boldParent: true,
                leafOnly: true,
              })}
              placeholder="Chọn danh mục con liên kết..."
              treeDefaultExpandAll
              allowClear
              showSearch
              treeNodeFilterProp="title"
              multiple
            />
          </Form.Item>

          <Form.Item label="Logo">
            <Upload
              listType="picture"
              maxCount={1}
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh logo</Button>
            </Upload>
          </Form.Item>

          <div className="admin-form-actions">
            <Button onClick={handleCancel}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              className="admin-btn-primary"
            >
              {editingBrand ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminBrands;
