import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Typography,
  Space,
  Popconfirm,
  message,
  Upload,
  Image,
  Row,
  Col,
  Tag,
  Tooltip,
  Badge,
  TreeSelect,
  Tabs,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  MinusCircleOutlined,
  RestOutlined,
  UndoOutlined,
  PictureOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined,
  InboxOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { productService } from "../../../services/productService";
import { categoryService } from "../../../services/categoryService";
import { brandService } from "../../../services/brandService";
import { supplierService } from "../../../services/supplierService";
import { stockService } from "../../../services/stockService";
import { formatCurrency, buildCategoryTree } from "../../../utils";
import { getImageUrl } from "../../../utils/imageHelper";
import { useAuth } from "../../../context/AuthContext";
import "../Admin.css";
import "./AdminProducts.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
// const UPLOAD_BASE = "http://localhost:5000/uploads/"; // Replaced by getImageUrl
const IMAGE_BASE = "/images/";

const getImgSrc = filename => {
  return getImageUrl(filename);
};

// ─── Helper: Tính tổng tồn kho của một sản phẩm ─────────────────────────────
const getTotalStock = record => {
  if (record.variants && record.variants.length > 0) {
    return record.variants.reduce(
      (sum, v) => sum + Number(v.variant_quantity || 0),
      0,
    );
  }
  const total = Number(record.total_quantity);
  return !isNaN(total) && total > 0
    ? total
    : Number(record.product_quantity) || 0;
};

// ─── Helper: Badge cảnh báo tồn kho ─────────────────────────────────────────
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
      <Tag
        icon={<WarningOutlined />}
        color="warning"
        className="admin-tag-status"
      >
        Sắp hết ({num})
      </Tag>
    );
  }
  return (
    <Tag
      icon={<CheckCircleOutlined />}
      color="success"
      className="admin-tag-status"
    >
      Còn hàng ({num})
    </Tag>
  );
};

// ─── Bảng con – Danh sách biến thể ─────────────────────────────────────────
const VariantSubTable = ({ variants }) => {
  const variantColumns = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 160,
      render: val =>
        val ? (
          <Text code copyable={{ tooltips: ["Sao chép SKU", "Đã sao chép!"] }}>
            {val}
          </Text>
        ) : (
          <Text type="secondary">---</Text>
        ),
    },
    {
      title: "Tên biến thể",
      dataIndex: "variant_name",
      key: "variant_name",
      render: val => val || "---",
    },
    {
      title: "Giá bán",
      key: "price",
      align: "right",
      render: (_, v) => {
        const price = Number(v.variant_price || 0);
        const discount = Number(v.variant_discount || 0);
        if (discount > 0 && discount < price) {
          return (
            <span>
              <Text
                delete
                type="secondary"
                className="admin-text-secondary-sm admin-variant-old-price"
              >
                {formatCurrency(price)}
              </Text>
              <Text type="danger" strong>
                {formatCurrency(discount)}
              </Text>
            </span>
          );
        }
        return <Text strong>{formatCurrency(price)}</Text>;
      },
    },
    {
      title: "Tồn kho",
      dataIndex: "variant_quantity",
      key: "variant_quantity",
      align: "center",
      render: qty => <StockBadge qty={qty} />,
    },
  ];

  return (
    <Table
      columns={variantColumns}
      dataSource={variants || []}
      rowKey="variant_id"
      pagination={false}
      size="small"
      className="admin-subtable"
    />
  );
};

// ─── Component chính ─────────────────────────────────────────────────────────
const AdminProducts = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 0;

  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterBrand, setFilterBrand] = useState(null);

  const [trashVisible, setTrashVisible] = useState(false);
  const [trashProducts, setTrashProducts] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  // ── Bulk Import (Nhập kho nhanh) ──────────────────────────────────────────
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isImportMode, setIsImportMode] = useState(false);

  const selectedBrandId = Form.useWatch("brand_id", form);

  const allowedCategoryIds = useMemo(() => {
    if (!selectedBrandId) return null;
    const brand = brands.find((b) => b.brand_id === selectedBrandId);
    return brand ? (brand.category_ids || []) : [];
  }, [selectedBrandId, brands]);

  const filteredFormCategories = useMemo(() => {
    if (!allowedCategoryIds) return categories;
    const allowedSet = new Set(allowedCategoryIds);
    categories.forEach(c => {
      if (allowedSet.has(c.category_id)) {
         let current = c;
         while (current && current.parent_id) {
           const pid = Number(current.parent_id);
           if (pid === 0) break;
           allowedSet.add(pid);
           current = categories.find(parent => parent.category_id === pid);
         }
      }
    });
    return categories.filter(c => allowedSet.has(c.category_id));
  }, [categories, allowedCategoryIds]);

  // ─── Computed: danh sách đã lọc theo tab ─────────────────────────────
  const lowStockProducts = useMemo(
    () => products.filter(p => getTotalStock(p) < 10),
    [products],
  );
  const displayedProducts = useMemo(() => {
    let result = products;
    if (activeTab === "low") result = lowStockProducts;

    if (searchText) {
      result = result.filter(p =>
        p.product_name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (filterCategory) {
      result = result.filter(p => p.category_id === filterCategory);
    }
    if (filterBrand) {
      result = result.filter(p => p.brand_id === filterBrand);
    }
    if (filterStatus) {
      result = result.filter(p => {
        let statusVal = p.product_active;
        if (statusVal === undefined) statusVal = p.product_acitve; // fallback for typo in backend
        const isActive = statusVal === 1 || statusVal === "1";
        return filterStatus === "active" ? isActive : !isActive;
      });
    }
    return result;
  }, [products, lowStockProducts, activeTab, searchText, filterCategory, filterBrand, filterStatus]);

  // Refresh mỗi khi tab được focus lại (sau khi nhập kho ở tab khác)
  useEffect(() => {
    fetchData();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prods, cats, brs] = await Promise.all([
        productService.getAll({ admin: true }),
        categoryService.getAll(),
        brandService.getAll(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setBrands(brs || []);
    } catch {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // ── Tab change: reset selection khi đổi tab ──────────────────────────────
  const handleTabChange = (key) => {
    setActiveTab(key);
    setSelectedRowKeys([]);
    setIsImportMode(false);
  };

  // ── Chuyển hướng sang trang Tạo phiếu nhập với variant_id ─────────────────
  const handleOpenBulkImport = () => {
    const selectedProducts = displayedProducts.filter(p =>
      selectedRowKeys.includes(p.product_id)
    );
    const variantIds = [];
    selectedProducts.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          variantIds.push(v.variant_id);
        });
      }
    });
    navigate('/admin/stock/create', { state: { preSelectedVariants: variantIds } });
  };

  const openAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setFileList([]);
    setModalVisible(true);
  };

  const handleViewDetails = (record) => {
    setViewRecord(record);
    setViewModalVisible(true);
  };

  const openEdit = record => {
    setEditingRecord(record);
    const formattedRecord = {
      ...record,
      brand_id: record.brand_id ? Number(record.brand_id) : undefined,
      category_id: record.category_id ? Number(record.category_id) : undefined,
    };
    form.setFieldsValue(formattedRecord);

    const initialFiles = [];
    if (record.product_image) {
      initialFiles.push({
        uid: "main_img",
        name: record.product_image,
        status: "done",
        url: getImgSrc(record.product_image),
        isExisting: true,
        filename: record.product_image,
      });
    }
    if (record.images && record.images.length > 0) {
      record.images.forEach(img => {
        if (img.image_url !== record.product_image) {
          initialFiles.push({
            uid: `gallery_${img.image_id}`,
            name: img.image_url,
            status: "done",
            url: getImgSrc(img.image_url),
            isExisting: true,
            filename: img.image_url,
          });
        }
      });
    }
    setFileList(initialFiles);
    setModalVisible(true);
  };

  const handleSoftDelete = async id => {
    try {
      await productService.softDelete(id);
      message.success("Đã chuyển vào thùng rác");
      fetchData();
    } catch {
      message.error("Chuyển vào thùng rác thất bại");
    }
  };

  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const data = await productService.getTrash();
      setTrashProducts(data || []);
    } catch {
      message.error("Lỗi tải thùng rác");
    } finally {
      setLoadingTrash(false);
    }
  };

  const handleRestore = async id => {
    try {
      await productService.restore(id);
      message.success("Đã khôi phục sản phẩm");
      fetchData();
      fetchTrash();
    } catch {
      message.error("Khôi phục thất bại");
    }
  };

  const handleHardDelete = async id => {
    try {
      await productService.hardDelete(id);
      message.success("Đã xóa vĩnh viễn");
      fetchTrash();
    } catch {
      message.error("Xóa vĩnh viễn thất bại");
    }
  };

  const handleSubmit = async values => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach(k => {
        if (k === "variants") {
          if (values[k]) {
            // Lọc bỏ last_import_price (chỉ dùng để hiển thị UI, không gửi lên backend)
            const cleanVariants = values[k].map(
              ({ last_import_price, ...rest }) => rest,
            );
            formData.append("variants", JSON.stringify(cleanVariants));
          }
        } else if (values[k] !== undefined && k !== "images") {
          formData.append(k, values[k]);
        }
      });

      if (!editingRecord) {
        formData.append("product_active", 1);
      }

      const finalOrder = [];
      fileList.forEach(file => {
        if (file.isExisting) {
          finalOrder.push(file.filename);
        } else {
          finalOrder.push("NEW_FILE");
          if (file.originFileObj) {
            formData.append("images", file.originFileObj);
          }
        }
      });
      formData.append("final_image_order", JSON.stringify(finalOrder));

      if (editingRecord) {
        await productService.update(editingRecord.product_id, formData);
        message.success("Cập nhật thành công");
      } else {
        await productService.create(formData);
        message.success("Thêm sản phẩm thành công");
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        message.error(error.response.data.error);
      } else {
        message.error("Thao tác thất bại");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 || currentStatus === "1" ? 0 : 1;
    try {
      await productService.updateStatus(id, newStatus);
      message.success("Cập nhật trạng thái thành công");
      fetchData();
    } catch {
      message.error("Lỗi cập nhật trạng thái");
    }
  };

  // ─── Columns chính ────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Ảnh",
      dataIndex: "product_image",
      width: 70,
      render: img => (
        <div className="admin-img-wrapper">
          <Image
            src={getImgSrc(img)}
            fallback="/placeholder.png"
            width={50}
            height={50}
            className="admin-img-cell"
          />
        </div>
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "product_name",
      ellipsis: true,
      render: name => <Text strong>{name}</Text>,
    },
    {
      title: "THƯƠNG HIỆU",
      key: "brand",
      render: (_, record) => {
        if (record.brand_name) {
          return <Tag color="blue">{record.brand_name}</Tag>;
        }
        return <Tag color="default">Khác</Tag>;
      },
    },
    {
      title: "Danh mục",
      dataIndex: "category_name",
      render: (name, record) =>
        name ||
        categories.find(c => c.category_id === record.category_id)
          ?.category_name ||
        "--",
    },
    {
      title: "Tổng tồn kho",
      align: "center",
      render: (_, record) => {
        const total = getTotalStock(record);
        return <StockBadge qty={total} />;
      },
    },
    {
      title: "Giá bán",
      align: "right",
      render: (_, record) => {
        if (record.variants && record.variants.length > 0) {
          const prices = record.variants.map(v => Number(v.variant_price || 0));
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const priceRange =
            min === max
              ? formatCurrency(min)
              : `${formatCurrency(min)} – ${formatCurrency(max)}`;

          const finalPrices = record.variants.map(v =>
            Number(v.variant_discount) > 0
              ? Number(v.variant_discount)
              : Number(v.variant_price),
          );
          const minF = Math.min(...finalPrices);
          const maxF = Math.max(...finalPrices);
          const finalRange =
            minF === maxF
              ? formatCurrency(minF)
              : `${formatCurrency(minF)} – ${formatCurrency(maxF)}`;

          const hasDiscount = record.variants.some(
            v => Number(v.variant_discount) > 0,
          );

          if (hasDiscount) {
            return (
              <div className="admin-price-col">
                <Typography.Text
                  delete
                  type="secondary"
                  className="admin-text-secondary-sm"
                >
                  {priceRange}
                </Typography.Text>
                <Typography.Text type="danger" strong>
                  {finalRange}
                </Typography.Text>
              </div>
            );
          }
          return <Typography.Text strong>{priceRange}</Typography.Text>;
        }

        const minPrice = Number(record.min_price);
        const maxPrice = Number(record.max_price);
        if (!isNaN(minPrice) && !isNaN(maxPrice) && maxPrice > 0) {
          const pRange =
            minPrice === maxPrice
              ? formatCurrency(minPrice)
              : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;
          return <Typography.Text strong>{pRange}</Typography.Text>;
        }

        const price = Number(record.product_price || 0);
        const discount = Number(record.product_discount || 0);
        if (discount > 0 && discount < price) {
          return (
            <div className="admin-price-col">
              <Typography.Text
                delete
                type="secondary"
                className="admin-text-secondary-sm"
              >
                {formatCurrency(price)}
              </Typography.Text>
              <Typography.Text type="danger" strong>
                {formatCurrency(discount)}
              </Typography.Text>
            </div>
          );
        }
        return (
          <Typography.Text strong>{formatCurrency(price)}</Typography.Text>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "product_active",
      align: "center",
      render: (val, record) => {
        let statusVal = val;
        if (statusVal === undefined) statusVal = record.product_acitve;
        const isActive = statusVal === 1 || statusVal === "1";
        const totalStock = getTotalStock(record);

        // ── Tầng 1: Admin chủ động tắt sản phẩm ──────────────────────────
        if (!isActive) {
          return (
            <Tag
              color="error"
              className="admin-pointer admin-tag-status admin-tag-status--clickable"
              onClick={() => handleStatusChange(record.product_id, statusVal)}
            >
              Ngừng hoạt động
            </Tag>
          );
        }

        // ── Tầng 2: Đang bật nhưng kho trống ─────────────────────────────
        if (totalStock === 0) {
          return (
            <Tooltip title="Sản phẩm đã hoàn tất thông tin, đang đợi nhập kho để chính thức mở bán">
              <Tag
                color="warning"
                className="admin-pointer admin-tag-status admin-tag-status--static"
              >
                Chờ nhập hàng
              </Tag>
            </Tooltip>
          );
        }

        // ── Tầng 3: Hoạt động bình thường ────────────────────────────────
        return (
          <Tag
            color="success"
            className="admin-pointer admin-tag-status admin-tag-status--clickable"
            onClick={() => handleStatusChange(record.product_id, statusVal)}
          >
            Hoạt động
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      render: (_, r) => (
        <Space>
          {!isAdmin && (
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(r)}
            >
              Xem chi tiết
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => openEdit(r)}
              >
                Sửa
              </Button>
              <Popconfirm
                title="Chuyển sản phẩm này vào thùng rác?"
                onConfirm={() => handleSoftDelete(r.product_id)}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button icon={<DeleteOutlined />} size="small" danger>
                  Xóa
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // ─── Columns thùng rác ───────────────────────────────────────────────────
  const trashColumns = [
    {
      title: "Ảnh",
      dataIndex: "product_image",
      width: 70,
      align: "center",
      render: img => (
        <Image
          src={getImgSrc(img)}
          fallback={`${IMAGE_BASE}${img}`}
          width={50}
          height={50}
          className="admin-img-cell"
        />
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "product_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Ngày xóa",
      dataIndex: "deleted_at",
      width: 160,
      align: "center",
      render: val => {
        if (!val) return "--";
        const d = new Date(val);
        const pad = n => n.toString().padStart(2, "0");
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      },
    },
    {
      title: "Thao tác",
      width: 220,
      align: "center",
      render: (_, r) => (
        <Space size="small">
          <Button
            icon={<UndoOutlined />}
            size="small"
            onClick={() => handleRestore(r.product_id)}
          >
            Khôi phục
          </Button>
          <Popconfirm
            title="Xóa vĩnh viễn sản phẩm này? (Không thể hoàn tác)"
            onConfirm={() => handleHardDelete(r.product_id)}
            okText="Xóa luôn"
            cancelText="Hủy"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Xóa vĩnh viễn
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Expandable config ───────────────────────────────────────────────────
  const expandable = {
    expandedRowRender: record => (
      <VariantSubTable variants={record.variants || []} />
    ),
    rowExpandable: record => record.variants && record.variants.length > 0,
  };

  // ── Row selection config ──────────────────────────────────────────────────
  const rowSelection = {
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys),
    getCheckboxProps: record => ({
      disabled: !record.variants || record.variants.length === 0,
    }),
  };

  return (
    <div>
      <div className="admin-page-header">
        <Title level={2}>🛍️ Quản lý sản phẩm</Title>
        <Space>
          {isImportMode ? (
            <Space>
              <Button
                type="primary"
                icon={<InboxOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleOpenBulkImport}
                style={{
                  background: '#fa8c16',
                  borderColor: '#fa8c16',
                  fontWeight: 600,
                }}
              >
                Tiến hành nhập kho {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
              </Button>
              <Button
                onClick={() => {
                  setIsImportMode(false);
                  setSelectedRowKeys([]);
                }}
              >
                Hủy chọn
              </Button>
            </Space>
          ) : (
            <Button
              icon={<InboxOutlined />}
              onClick={() => setIsImportMode(true)}
              style={{
                borderColor: '#fa8c16',
                color: '#fa8c16',
                fontWeight: 600,
              }}
            >
              Nhập kho nhanh
            </Button>
          )}
          <Button
            icon={<RestOutlined />}
            onClick={() => {
              setTrashVisible(true);
              fetchTrash();
            }}
          >
            Thùng rác
          </Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
              className="admin-btn-primary"
            >
              Thêm sản phẩm
            </Button>
          )}
        </Space>
      </div>

      {/* ─── Bộ lọc (Filter Bar) ────────────────────────────────────── */}
      <div className="admin-filter-bar" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="Tìm kiếm theo tên sản phẩm..."
            allowClear
            onSearch={value => setSearchText(value)}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Lọc theo Danh mục"
            allowClear
            style={{ width: 250 }}
            onChange={value => setFilterCategory(value)}
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
          <Select
            placeholder="Lọc theo Thương hiệu"
            allowClear
            style={{ width: 180, marginRight: 8 }}
            onChange={value => setFilterBrand(value)}
            options={(brands || [])
              .filter(b => {
                if (!filterCategory) return true;
                // Hiển thị thương hiệu nếu category_ids của nó có chứa danh mục đang lọc
                // Hoặc (phòng hờ) nếu có sản phẩm nào thuộc danh mục này mang thương hiệu này
                const inBrandCat = b.category_ids && b.category_ids.includes(filterCategory);
                const hasProduct = products.some(p => p.category_id === filterCategory && p.brand_id === b.brand_id);
                return inBrandCat || hasProduct;
              })
              .map(b => ({ label: b.brand_name, value: b.brand_id }))}
            showSearch
            optionFilterProp="label"
          />
          <Select
            placeholder="Lọc theo Trạng thái"
            allowClear
            style={{ width: 200 }}
            onChange={value => setFilterStatus(value)}
            options={[
              { value: "active", label: "Hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
            ]}
          />
        </Space>
      </div>

      {/* ─── Tabs bộ lọc tồn kho ────────────────────────────────────── */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="admin-tabs-filter"
        items={[
          {
            key: "all",
            label: `Tất cả (${products.length})`,
          },
          {
            key: "low",
            label: (
              <span>
                Sắp hết hàng&nbsp;
                <Badge
                  count={lowStockProducts.length}
                  showZero
                  color={lowStockProducts.length > 0 ? "#fa8c16" : "#52c41a"}
                  className="admin-badge-count"
                />
              </span>
            ),
          },
        ]}
      />

      {/* ─── Bảng chính có Expandable Row ─────────────────────────────── */}
      <Table
        dataSource={displayedProducts}
        columns={columns}
        loading={loading}
        rowKey="product_id"
        expandable={expandable}
        rowSelection={isImportMode ? rowSelection : undefined}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          locale: { items_per_page: '/ trang' },
          showTotal: (total) => `Tổng ${total} sản phẩm`,
        }}
      />

      {/* ─── Modal Thêm / Sửa sản phẩm ────────────────────────────────── */}
      <Modal
        title={editingRecord ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={960}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Tên sản phẩm"
            name="product_name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          {/* ── Phần ảnh sản phẩm ──────────────────────────────────────── */}
          <Form.Item
            label={
              <span>
                <PictureOutlined className="admin-icon-mr" />
                Hình ảnh sản phẩm
                <Typography.Text
                  type="secondary"
                  className="admin-text-secondary-sm admin-icon-ml"
                >
                  (Tối đa 10 ảnh, mỗi ảnh ≤ 2MB)
                </Typography.Text>
              </span>
            }
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              beforeUpload={() => false}
              multiple
              accept="image/*"
              style={{ marginTop: '16px' }}
              className="admin-upload-list-custom"
              itemRender={(originNode, file, currFileList) => {
                const index = currFileList.indexOf(file);
                const isMain = index === 0;

                const node = isMain ? (
                  <Badge
                    count="Ảnh chính"
                    className="main-image-badge admin-badge-main"
                  >
                    {originNode}
                  </Badge>
                ) : (
                  originNode
                );

                return (
                  <div
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData("dragIndex", index);
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      const dragIndex = Number(e.dataTransfer.getData("dragIndex"));
                      const dropIndex = index;
                      if (dragIndex !== dropIndex) {
                        const newFileList = [...fileList];
                        const item = newFileList.splice(dragIndex, 1)[0];
                        newFileList.splice(dropIndex, 0, item);
                        setFileList(newFileList);
                      }
                    }}
                    style={{ cursor: "grab", display: "inline-block", height: "100%" }}
                  >
                    {node}
                  </div>
                );
              }}
            >
              {fileList.length < 10 && (
                <div>
                  <PlusOutlined />
                  <div className="admin-upload-add">Thêm ảnh</div>
                </div>
              )}
            </Upload>
            {fileList.length > 0 && (
              <Typography.Text type="secondary" className="admin-hint-text">
                Gợi ý: Bạn có thể <b>kéo thả (drag & drop)</b> các ảnh để sắp xếp lại. Ảnh ở vị trí <b>đầu tiên</b> sẽ được chọn làm <b>ảnh đại diện chính</b>.
              </Typography.Text>
            )}
          </Form.Item>

          {/* ── Biến thể ───────────────────────────────────────────────── */}
          <div className="admin-variant-header">
            <Typography.Text strong>
              Cấu hình biến thể (Variants)
            </Typography.Text>
          </div>

          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    className="admin-variant-row"
                    align="baseline"
                    wrap
                  >
                    {/* Hidden field giữ variant_id để backend biết update hay insert */}
                    <Form.Item
                      {...restField}
                      name={[name, "variant_id"]}
                      hidden
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "variant_name"]}
                      rules={[{ required: true, message: "Nhập tên" }]}
                    >
                      <Input placeholder="Tên biến thể (VD: Gói 65g)" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "variant_price"]}
                      rules={[{ required: true, message: "Nhập giá" }]}
                    >
                      <InputNumber
                        placeholder="Giá gốc"
                        min={0}
                        className="admin-input-price"
                      />
                    </Form.Item>

                    {/* ── Giá khuyến mãi + cảnh báo giá vốn ── */}
                    <Form.Item className="admin-fi-no-mb">
                      <Form.Item
                        {...restField}
                        name={[name, "variant_discount"]}
                        className="admin-fi-discount-inner"
                      >
                        <InputNumber
                          placeholder="Giá KM"
                          min={0}
                          className="admin-input-price"
                        />
                      </Form.Item>

                      {/* Nhãn cảnh báo giá vốn – chỉ hiện khi đang sửa và biến thể đã có last_import_price */}
                      <Form.Item shouldUpdate className="admin-fi-no-mb">
                        {({ getFieldValue }) => {
                          const variants = getFieldValue("variants") || [];
                          const currentVariant = variants[name] || {};
                          const lastImport = Number(
                            currentVariant.last_import_price || 0,
                          );
                          if (!lastImport) return null;

                          const discount = Number(
                            currentVariant.variant_discount || 0,
                          );
                          const price = Number(
                            currentVariant.variant_price || 0,
                          );
                          const effectivePrice =
                            discount > 0 && discount < price ? discount : price;
                          const isBelowCost =
                            effectivePrice > 0 && effectivePrice < lastImport;

                          return (
                            <div
                              className={`admin-cost-label ${
                                isBelowCost
                                  ? "admin-cost-label--warn"
                                  : "admin-cost-label--ok"
                              }`}
                            >
                              {isBelowCost ? (
                                <span className="admin-cost-warn-text">
                                  ⚠️ Cảnh báo: Thấp hơn giá nhập (
                                  {formatCurrency(lastImport)})!
                                </span>
                              ) : (
                                <span className="admin-cost-ok-text">
                                  Giá nhập gần nhất:{" "}
                                  {formatCurrency(lastImport)}
                                </span>
                              )}
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Form.Item>

                    {/* ── Số lượng: Luôn Disabled, cập nhật qua Nhập kho ── */}
                    <Space size={4} align="center">
                      <Form.Item
                        {...restField}
                        name={[name, "variant_quantity"]}
                        className="admin-fi-no-mb"
                      >
                        <InputNumber
                          placeholder="Số lượng"
                          min={0}
                          className="admin-input-qty admin-qty-disabled"
                          disabled={true}
                        />
                      </Form.Item>
                      <Tooltip title="Số lượng được cập nhật tự động từ Module Nhập kho">
                        <QuestionCircleOutlined className="admin-help-icon" />
                      </Tooltip>
                    </Space>

                    <Form.Item {...restField} name={[name, "sku"]}>
                      <Input
                        placeholder="SKU / Mã kho"
                        className="admin-input-price"
                        style={{ width: 180 }}
                      />
                    </Form.Item>

                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}

                {/* Ghi chú khi đang ở chế độ chỉnh sửa */}
                {editingRecord && (
                  <div className="admin-stock-warning-banner">
                    <WarningOutlined className="admin-warning-icon" />
                    <Text className="admin-stock-warning-text">
                      Số lượng chỉ được cập nhật tự động thông qua{" "}
                      <b>Phiếu nhập kho</b>. Vui lòng không chỉnh sửa thủ công.
                    </Text>
                  </div>
                )}

                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add({ variant_quantity: 0 })}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm biến thể
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item label="Thương hiệu" name="brand_id">
            <Select
              showSearch
              placeholder="Chọn thương hiệu"
              allowClear
              optionFilterProp="children"
              onChange={() => form.setFieldsValue({ category_id: undefined })}
            >
              {brands.map(b => (
                <Option key={b.brand_id} value={b.brand_id}>
                  {b.brand_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Danh mục"
            name="category_id"
            rules={[{ required: true }]}
          >
            <TreeSelect
              treeData={buildCategoryTree(filteredFormCategories, {
                boldParent: true,
                leafOnly: true,
              })}
              placeholder="Chọn danh mục con..."
              treeDefaultExpandAll
              allowClear
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>

          <Form.Item label="Mô tả" name="product_description">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Chi tiết" name="product_details">
            <TextArea rows={4} />
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

      {/* ─── Modal Thùng rác ─────────────────────────────────────────────── */}
      <Modal
        title="Thùng rác - Sản phẩm đã xóa"
        open={trashVisible}
        onCancel={() => setTrashVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          dataSource={trashProducts}
          columns={trashColumns}
          loading={loadingTrash}
          rowKey="product_id"
          locale={{ emptyText: "Thùng rác trống" }}
          scroll={{ x: 670 }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            locale: { items_per_page: '/ trang' },
            showTotal: (total) => `Tổng ${total} sản phẩm đã xóa`,
          }}
        />
      </Modal>
      {/* ─── Modal Xem chi tiết sản phẩm (Read-only) ──────────────────────── */}
      <Modal
        title="Chi tiết sản phẩm"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>Đóng</Button>
        ]}
        width={800}
      >
        {viewRecord && (
          <Row gutter={24}>
            <Col span={8}>
              <Image 
                src={getImgSrc(viewRecord.product_image)} 
                fallback="/placeholder.png" 
                style={{ width: '100%', borderRadius: 8, border: '1px solid #f0f0f0' }} 
              />
            </Col>
            <Col span={16}>
              <Title level={4} style={{ marginTop: 0 }}>{viewRecord.product_name}</Title>
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Tag color="blue">{viewRecord.brand_name || "Khác"}</Tag>
                  <Tag color="cyan">
                    {viewRecord.category_name || categories.find(c => c.category_id === viewRecord.category_id)?.category_name || "--"}
                  </Tag>
                  <StockBadge qty={getTotalStock(viewRecord)} />
                </Space>
              </div>
              
              <Table 
                dataSource={viewRecord.variants || []} 
                columns={[
                  { title: "SKU", dataIndex: "sku", key: "sku" },
                  { title: "Tên biến thể", dataIndex: "variant_name", key: "variant_name" },
                  { title: "Giá bán", key: "price", render: (_, v) => formatCurrency(v.variant_price) },
                  { title: "Khuyến mãi", key: "discount", render: (_, v) => Number(v.variant_discount) > 0 ? formatCurrency(v.variant_discount) : "--" },
                  { title: "Tồn kho", dataIndex: "variant_quantity", key: "qty" }
                ]}
                rowKey="variant_id"
                pagination={false}
                size="small"
                bordered
              />
              
              {(!viewRecord.variants || viewRecord.variants.length === 0) && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Giá bán lẻ: </Text> <Text>{formatCurrency(viewRecord.product_price || 0)}</Text><br/>
                  <Text strong>Khuyến mãi: </Text> <Text>{Number(viewRecord.product_discount) > 0 ? formatCurrency(viewRecord.product_discount) : "--"}</Text><br/>
                  <Text strong>Tồn kho: </Text> <Text>{getTotalStock(viewRecord)}</Text>
                </div>
              )}
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default AdminProducts;
