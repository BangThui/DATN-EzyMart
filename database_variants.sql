-- Ecomarket Database - Product Variants Refactored
-- phpMyAdmin SQL Dump

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Base Categories
CREATE TABLE `tbl_category` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `tbl_category` (`category_id`, `category_name`) VALUES
(1, 'Trái cây '),
(3, 'Đồ uống'),
(69, 'Sữa các loại '),
(73, 'Bánh kẹo'),
(74, 'Mì - Thực phẩm ăn liền'),
(75, 'Thực Phẩm Khô'),
(79, 'Thực Phẩm Chế Biến'),
(80, 'Gia Vị');

-- ==========================================
-- 1. CHỈNH SỬA BẢNG PRODUCT
-- (Đã xóa product_price và product_quantity)
-- ==========================================
CREATE TABLE `product` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_details` text NOT NULL,
  `product_description` text NOT NULL,
  `product_acitve` int(11) NOT NULL,
  `product_hot` int(11) NOT NULL,
  `product_image` varchar(50) NOT NULL,
  PRIMARY KEY (`product_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `product_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `tbl_category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dữ liệu mẫu (Gồm Bia Carlsberg và 7 UP)
INSERT INTO `product` (`product_id`, `category_id`, `product_name`, `product_details`, `product_description`, `product_acitve`, `product_hot`, `product_image`) VALUES
(1, 3, 'Bia Carlsberg', 'Bia Đan Mạch cao cấp', 'Bia Carlsberg mang hương vị êm mượt, sảng khoái, mang lại trải nghiệm tuyệt vời cho những dịp tụ tập.', 1, 1, 'carlsberg.jpg'),
(2, 3, 'Nước ngọt 7UP', 'Nước giải khát có gas vị chanh', 'Nước Giải Khát Có Gas 7 Up mang đến vị chua ngọt thanh mát đặc trưng.', 1, 1, '7up.jpg');

-- ==========================================
-- 2. TẠO BẢNG MỚI: PRODUCT_VARIANTS
-- (Lưu thông tin biến thể: Lon, Thùng,...)
-- ==========================================
CREATE TABLE `product_variants` (
  `variant_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `variant_name` varchar(100) NOT NULL,
  `variant_price` varchar(50) NOT NULL,
  `variant_discount` varchar(50) DEFAULT NULL,
  `variant_quantity` int(11) NOT NULL,
  `sku` varchar(50) NOT NULL,
  PRIMARY KEY (`variant_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_pv_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dữ liệu mẫu Biến thể
INSERT INTO `product_variants` (`variant_id`, `product_id`, `variant_name`, `variant_price`, `variant_discount`, `variant_quantity`, `sku`) VALUES
-- Biến thể Bia Carlsberg:
(1, 1, 'Lon 330ml', '20000', '18000', 150, 'CARLS-LON'),
(2, 1, 'Thùng 24 Lon', '450000', '430000', 80, 'CARLS-THUNG'),

-- Biến thể Nước ngọt 7 UP:
(3, 2, 'Chai 1.5L', '20500', '14900', 20, '7UP-CHAI15L'),
(4, 2, 'Thùng 24 Lon 330ml', '230000', '179000', 15, '7UP-THUNG24');

-- ==========================================
-- 3. BẢNG NGƯỜI DÙNG & KHÁCH HÀNG
-- ==========================================
CREATE TABLE `quanli_user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `role` tinyint(1) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `user_email` varchar(50) NOT NULL,
  `user_phone` varchar(10) NOT NULL,
  `user_password` varchar(100) NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `customer` (
  `customer_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(50) NOT NULL,
  `customer_address` varchar(200) NOT NULL,
  `customer_email` varchar(150) NOT NULL,
  PRIMARY KEY (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 4. BẢNG CART (CẬP NHẬT THÊM VARIANT_ID)
-- ==========================================
CREATE TABLE `cart` (
  `cart_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `product_quantity` int(11) NOT NULL,
  PRIMARY KEY (`cart_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `quanli_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 5. BẢNG DONHANG (CẬP NHẬT THÊM VARIANT_ID)
-- ==========================================
CREATE TABLE `donhang` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `mahang` varchar(50) NOT NULL,
  `soluong` int(11) NOT NULL,
  `tongDoanhThu` int(11) NOT NULL,
  `trangThai` tinyint(4) NOT NULL,
  `ngayDatHang` date NOT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `fk_donhang_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_donhang_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 6. BẢNG GIAODICH (CẬP NHẬT THÊM VARIANT_ID)
-- ==========================================
CREATE TABLE `giaodich` (
  `giaodich_id` int(11) NOT NULL AUTO_INCREMENT,
  `khachhang_id` int(11) NOT NULL,
  `sanpham_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL, /* Liên kết trực tiếp biến thể */
  `soluong` int(11) NOT NULL,
  `magiaodich` varchar(50) NOT NULL,
  `ngayThangNam` date NOT NULL,
  PRIMARY KEY (`giaodich_id`),
  KEY `khachhang_id` (`khachhang_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `fk_gd_khachhang` FOREIGN KEY (`khachhang_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gd_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
