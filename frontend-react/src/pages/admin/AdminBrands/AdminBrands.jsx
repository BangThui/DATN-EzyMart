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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [brandsData, categoriesData] = await Promise.all([
        brandService.getAll(),
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
        category_id: record.category_id,
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
      message.error("Lỗi khi xóa thương hiệu!");
    }
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleFinish = async values => {
    try {
      const formData = new FormData();
      formData.append("brand_name", values.brand_name);
      if (values.category_id) {
        formData.append("category_id", values.category_id);
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
      message.error("Lỗi khi lưu thương hiệu!");
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
      dataIndex: "category_id",
      key: "category_id",
      render: catId => {
        if (!Array.isArray(categories)) return "---";
        const cat = categories.find(c => c.category_id === catId);
        return cat ? cat.category_name : "---";
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          className="admin-btn-primary"
        >
          Thêm Thương Hiệu
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={brands || []}
        rowKey="brand_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
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

          <Form.Item name="category_id" label="Danh Mục Liên Kết">
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
