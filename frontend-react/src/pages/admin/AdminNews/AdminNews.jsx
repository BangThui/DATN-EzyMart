import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Tag, Select, Typography, message, Modal, Form,
  Input, Button, Space, Row, Col, Switch, Popconfirm,
  Upload, Tooltip, Image,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, UploadOutlined, FileImageOutlined,
} from '@ant-design/icons';
import { newsService } from '../../../services/newsService';
import { getImageUrl } from '../../../utils/imageHelper';
import '../Admin.css';
import './AdminNews.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminNews = () => {
  // ── State: list & filter ────────────────────────────────────────────────────
  const [newsList, setNewsList]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');   // '' = tất cả

  // ── State: modal form ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // null = thêm mới
  const [submitting, setSubmitting]     = useState(false);

  // ── State: upload ảnh ───────────────────────────────────────────────────────
  const [fileList, setFileList]         = useState([]);    // ant-design Upload fileList
  const [previewUrl, setPreviewUrl]     = useState(null);  // ảnh hiện tại khi edit

  const [form] = Form.useForm();
  const searchTimerRef = useRef(null);

  // ─── Fetch dữ liệu ──────────────────────────────────────────────────────────
  const fetchNews = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await newsService.adminGetAll(params);
      setNewsList(res?.data || []);
    } catch {
      message.error('Lỗi tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // ─── Filter helpers ──────────────────────────────────────────────────────────
  const applyFilter = useCallback(
    (overrides = {}) => {
      const search = overrides.search !== undefined ? overrides.search : filterSearch;
      const status = overrides.status !== undefined ? overrides.status : filterStatus;
      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (status !== '') params.status = status;
      fetchNews(params);
    },
    [filterSearch, filterStatus, fetchNews],
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setFilterSearch(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      applyFilter({ search: val });
    }, 500);
  };

  const handleStatusFilter = (val) => {
    setFilterStatus(val);
    applyFilter({ status: val });
  };

  const handleReset = () => {
    setFilterSearch('');
    setFilterStatus('');
    fetchNews();
  };

  // ─── Status toggle (Switch) ──────────────────────────────────────────────────
  const handleStatusToggle = async (record, checked) => {
    try {
      await newsService.updateStatus(record.news_id, checked ? 1 : 0);
      message.success('Cập nhật trạng thái thành công');
      fetchNews({ search: filterSearch, status: filterStatus });
    } catch {
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  // ─── Xóa bài viết ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await newsService.delete(id);
      message.success('Xóa bài viết thành công');
      applyFilter();
    } catch {
      message.error('Xóa bài viết thất bại');
    }
  };

  // ─── Mở modal Thêm / Sửa ────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingRecord(null);
    setFileList([]);
    setPreviewUrl(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = async (record) => {
    setEditingRecord(record);
    setFileList([]);
    setPreviewUrl(record.image ? getImageUrl(record.image) : null);

    // Load nội dung đầy đủ (content) từ API chi tiết
    try {
      const res = await newsService.getById(record.news_id);
      const full = res?.data || record;
      form.setFieldsValue({
        title:       full.title       || '',
        description: full.description || '',
        content:     full.content     || '',
        status:      full.status !== undefined ? Number(full.status) : 1,
      });
    } catch {
      form.setFieldsValue({
        title:       record.title       || '',
        description: record.description || '',
        content:     '',
        status:      record.status !== undefined ? Number(record.status) : 1,
      });
    }
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFileList([]);
    setPreviewUrl(null);
    form.resetFields();
  };

  // ─── Submit form (Thêm / Sửa) ────────────────────────────────────────────────
  const handleFormSubmit = async (values) => {
    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title',       values.title.trim());
      formData.append('description', values.description || '');
      formData.append('content',     values.content     || '');
      formData.append('status',      values.status !== undefined ? values.status : 1);

      // Đính kèm file ảnh nếu người dùng chọn file mới
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }

      if (editingRecord) {
        await newsService.update(editingRecord.news_id, formData);
        message.success('Cập nhật bài viết thành công');
      } else {
        await newsService.create(formData);
        message.success('Thêm bài viết thành công');
      }

      handleModalClose();
      applyFilter();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate Ant Design — hiển thị tự động
      message.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Upload: custom request (không upload ngay, giữ lại để submit cùng form) ─
  const handleUploadChange = ({ fileList: newFileList }) => {
    // Chỉ giữ file cuối cùng
    const lastFile = newFileList.slice(-1);
    setFileList(lastFile);
    if (lastFile.length > 0 && lastFile[0].originFileObj) {
      const url = URL.createObjectURL(lastFile[0].originFileObj);
      setPreviewUrl(url);
    } else if (lastFile.length === 0) {
      setPreviewUrl(editingRecord?.image ? getImageUrl(editingRecord.image) : null);
    }
  };

  // ─── Cột bảng dữ liệu ───────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Mã tin',
      dataIndex: 'news_id',
      width: 70,
      align: 'center',
      render: (id) => <Text type="secondary">#{id}</Text>,
    },
    {
      title: 'Ảnh đại diện',
      dataIndex: 'image',
      width: 90,
      align: 'center',
      render: (img) => {
        const src = img ? getImageUrl(img) : null;
        return src ? (
          <Image
            src={src}
            alt="thumbnail"
            className="admin-news-img-cell"
            width={60}
            height={60}
            preview={{ mask: <span style={{ fontSize: 12 }}>Xem</span> }}
          />
        ) : (
          <div className="admin-news-img-placeholder">
            <FileImageOutlined className="admin-news-placeholder-icon" />
          </div>
        );
      },
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
      render: (title) => <strong>{title}</strong>,
    },
    {
      title: 'Mô tả ngắn',
      dataIndex: 'description',
      width: 260,
      ellipsis: true,
      render: (desc) => desc || <Text type="secondary" italic>(Chưa có mô tả)</Text>,
    },
    {
      title: 'Ngày đăng/Cập nhật',
      width: 155,
      align: 'center',
      render: (_, record) => {
        if (record.updated_at) {
          return (
            <Tooltip title={`Ngày tạo gốc: ${formatDate(record.created_at)}`}>
              <span className="admin-news-updated-text">
                🔄 Đã cập nhật: {formatDate(record.updated_at)}
              </span>
            </Tooltip>
          );
        }
        return <span>📅 {formatDate(record.created_at)}</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      align: 'center',
      render: (status, record) => (
        <Space direction="vertical" size={4} className="admin-news-status-space">
          <Switch
            checked={Number(status) === 1}
            checkedChildren="Hiển thị"
            unCheckedChildren="Ẩn"
            size="default"
            onChange={(checked) => handleStatusToggle(record, checked)}
          />
          <Tag color={Number(status) === 1 ? 'success' : 'default'} className="admin-news-status-tag">
            {Number(status) === 1 ? 'Đang hiển thị' : 'Đang ẩn'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditModal(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa bài viết này không?"
            okText="Xóa"
            cancelText="Hủy"
            okType="danger"
            onConfirm={() => handleDelete(record.news_id)}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Tiêu đề trang */}
      <div className="admin-page-header">
        <Title level={2} className="admin-news-title-text">📰 Quản lý bài viết / Tin tức</Title>
        <Button
          id="btn-add-news"
          type="primary"
          icon={<PlusOutlined />}
          className="admin-btn-primary"
          onClick={openAddModal}
        >
          Thêm bài viết
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="admin-news-filter-bar">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              id="news-search-input"
              placeholder="Tìm kiếm theo tiêu đề bài viết..."
              prefix={<SearchOutlined className="admin-news-search-icon" />}
              allowClear
              value={filterSearch}
              onChange={handleSearchChange}
              onPressEnter={() => applyFilter()}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              id="news-status-filter"
              className="admin-w-full"
              placeholder="Lọc theo trạng thái"
              value={filterStatus === '' ? undefined : filterStatus}
              allowClear
              onChange={(val) => handleStatusFilter(val !== undefined ? val : '')}
            >
              <Option value="">Tất cả trạng thái</Option>
              <Option value="1">Đang hiển thị</Option>
              <Option value="0">Đang ẩn</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4} md={4}>
            <Button onClick={handleReset} className="admin-w-full">
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </div>

      {/* Bảng danh sách */}
      <Table
        dataSource={newsList}
        columns={columns}
        loading={loading}
        rowKey="news_id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          locale: { items_per_page: '/ trang' },
          showTotal: (total) => `Tổng ${total} bài viết`,
        }}
      />

      {/* Modal Thêm / Sửa bài viết */}
      <Modal
        title={
          <span className="admin-news-modal-title">
            {editingRecord ? `✏️ Chỉnh sửa: ${editingRecord.title}` : '➕ Thêm bài viết mới'}
          </span>
        }
        open={modalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={820}
        centered
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 1 }}
          className="admin-news-form"
          onFinish={handleFormSubmit}
        >
          {/* Tiêu đề */}
          <Form.Item
            name="title"
            label="Tiêu đề bài viết"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề bài viết' }]}
          >
            <Input
              id="news-form-title"
              placeholder="Nhập tiêu đề bài viết..."
              maxLength={255}
              showCount
            />
          </Form.Item>

          {/* Mô tả ngắn */}
          <Form.Item
            name="description"
            label="Mô tả ngắn"
            extra="Hiển thị ở trang danh sách tin tức (tóm tắt nội dung)"
          >
            <TextArea
              id="news-form-description"
              placeholder="Nhập mô tả ngắn về bài viết..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Ảnh đại diện */}
          <Form.Item
            name="image"
            label="Ảnh đại diện"
            extra="Định dạng: JPG, PNG, GIF, WebP — Tối đa 5MB"
          >
            <div className="admin-news-upload-container">
              <Upload
                id="news-form-image"
                fileList={fileList}
                beforeUpload={() => false}          // Không upload ngay, submit cùng form
                onChange={handleUploadChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                maxCount={1}
                listType="picture"
                showUploadList={{ showRemoveIcon: true }}
              >
                <Button icon={<UploadOutlined />}>
                  {editingRecord && previewUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                </Button>
              </Upload>

              {/* Preview ảnh hiện tại (khi edit) */}
              {previewUrl && fileList.length === 0 && (
                <div>
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="admin-news-preview-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="admin-news-preview-label">Ảnh hiện tại</div>
                </div>
              )}
            </div>
          </Form.Item>

          {/* Nội dung chi tiết */}
          <Form.Item
            name="content"
            label={
              <span>
                Nội dung chi tiết&nbsp;
                <Text type="secondary" className="admin-text-secondary-sm">
                  (Hỗ trợ HTML cơ bản)
                </Text>
              </span>
            }
          >
            <TextArea
              id="news-form-content"
              placeholder="Nhập nội dung chi tiết của bài viết tại đây..."
              rows={12}
              className="admin-news-content-textarea"
            />
          </Form.Item>

          {/* Trạng thái */}
          <Form.Item
            name="status"
            label="Trạng thái hiển thị"
          >
            <Select id="news-form-status" className="admin-news-form-status">
              <Option value={1}>
                <Tag color="success" className="admin-news-tag-no-margin">Hiển thị</Tag>
              </Option>
              <Option value={0}>
                <Tag color="default" className="admin-news-tag-no-margin">Ẩn</Tag>
              </Option>
            </Select>
          </Form.Item>

          <div className="admin-form-actions">
            <Button onClick={handleModalClose}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="admin-btn-primary"
            >
              {editingRecord ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminNews;
