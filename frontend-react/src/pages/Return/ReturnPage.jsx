import React, { useEffect, useState } from "react";
import { Typography, Table } from "antd";
import axiosClient from "../../services/axiosClient";
import "./ReturnPage.css";

const { Title, Text } = Typography;

const ReturnPage = () => {
  const [settings, setSettings] = useState({
    store_name: "EZYMART",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSettings = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await axiosClient.get(`/settings?t=${timestamp}`);
        if (res) {
          setSettings(prev => ({
            ...prev,
            store_name: res.store_name ? res.store_name.toUpperCase() : "EZYMART",
          }));
        }
      } catch (error) {
        console.error("Lỗi lấy cấu hình:", error);
      }
    };
    fetchSettings();
  }, []);

  const storeName = settings.store_name;

  const tableColumns = [
    {
      title: 'Trường Hợp',
      dataIndex: 'case',
      key: 'case',
      width: '30%',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: 'Đổi hàng',
      dataIndex: 'exchange',
      key: 'exchange',
      width: '40%',
      render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} />
    },
    {
      title: 'Trả hàng',
      dataIndex: 'return',
      key: 'return',
      width: '30%',
      render: (text, row, index) => {
        const obj = {
          children: <div dangerouslySetInnerHTML={{ __html: text }} />,
          props: {},
        };
        if (index === 0) {
          obj.props.rowSpan = 2;
        }
        if (index === 1) {
          obj.props.rowSpan = 0;
        }
        return obj;
      },
    },
  ];

  const tableData = [
    {
      key: '1',
      case: 'Hàng hóa kém chất lượng, hỏng hóc, quá hạn sử dụng hoặc lỗi kỹ thuật.',
      exchange: `- "Một đổi một" theo yêu cầu của khách hàng<br/>- Nếu sản phẩm khách hàng yêu cầu đổi không còn, Khách hàng được hoàn trả bằng biên nhận thanh toán (chỉ sử dụng để thanh toán khi mua hàng ở siêu thị trong vòng 15 ngày kể từ ngày cấp phát)`,
      return: `Khách hàng được hoàn trả bằng biên nhận thanh toán (chỉ sử dụng để thanh toán khi mua hàng ở siêu thị trong vòng 15 ngày kể từ ngày cấp phát)`
    },
    {
      key: '2',
      case: 'Khách hàng thay đổi quyết định mua hàng',
      exchange: `- Đổi màu/ kích cỡ cùng mã hàng: thực hiện "Một đổi một"<br/>- Nếu khác mã hàng, khác giá hoặc sản phẩm khách yêu cầu không còn, Khách hàng được hoàn trả bằng biên nhận thanh toán (chỉ sử dụng để thanh toán khi mua hàng ở siêu thị trong vòng 15 ngày kể từ ngày cấp phát)`,
      return: `Khách hàng được hoàn trả bằng biên nhận thanh toán (chỉ sử dụng để thanh toán khi mua hàng ở siêu thị trong vòng 15 ngày kể từ ngày cấp phát)`
    }
  ];

  return (
    <div className="return-page-wrap">
      <Title level={2} className="return-main-title">
        CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM
      </Title>

      <div className="return-content">
        <Text strong className="return-section-title">
          1. Quy định chung.
        </Text>
        <ul className="return-list">
          <li>- Chính sách đổi/ trả hàng được áp dụng trong vòng 07 ngày kể từ ngày mua hàng.</li>
          <li>- Khách hàng có quyền đổi hoặc trả khi mua phải hàng hóa kém chất lượng, hỏng hóc, quá hạn sử dụng hoặc do lỗi kỹ thuật khi thao tác của nhân viên {storeName}.</li>
          <li>- Khách hàng có thể đổi hoặc trả hàng do thay đổi ý định mua hàng đối với những hàng hóa không thuộc "Nhóm hàng hóa không áp dụng đổi/ trả" dưới đây nếu đáp ứng điều kiện đổi sản phẩm quy định tại Mục 3.</li>
          <li>- Nhóm hàng hóa không áp dụng đổi/ trả:
            <ul className="return-sublist">
              <li>• Hàng điện, điện tử.</li>
              <li>• Mỹ Phẩm, phụ kiện, trang phục lót, đồ bơi, đồ tập thể dục.</li>
              <li>• Rượu, thuốc lá.</li>
              <li>• Thực phẩm tươi sống/ đông lạnh/ bảo quản lạnh.</li>
              <li>• Sản phẩm sơ chế hoặc nấu chín, hoặc thực phẩm có hạn sử dụng dưới 07 ngày.</li>
              <li>• Hàng tặng, hàng khuyến mại, hàng thanh lý (có thông báo chính thức tại quầy hàng)</li>
              <li>• Sản phẩm hư hỏng do không tuân thủ hướng dẫn sử dụng hoặc bảo quản của nhà sản xuất.</li>
            </ul>
          </li>
        </ul>

        <Text strong className="return-section-title">
          2. Điều kiện đổi – Trả hàng.
        </Text>
        <ul className="return-list">
          <li>- Hàng hóa đổi – trả chỉ được thực hiện tại quầy DVKH của cửa hàng tiện lợi {storeName} đã tiến hành xuất hàng cho Khách hàng mua hàng trước đó (thông tin siêu thị đã xuất bán thể hiện trên Hóa đơn mua hàng).</li>
          <li>- Hàng hóa được đổi/ trả bằng đúng với giá của khách hàng đã mua khi được xuất trình cùng với các chứng từ liên quan (Bản gốc hóa đơn bán lẻ/hóa đơn GTGT).</li>
          <li>- Điểm tích lũy tương ứng với giá trị hàng trả sẽ khấu trừ trên hệ thống.</li>
          <li>- Điều kiện bắt buộc về hàng hóa để đổi/ trả khi khách hàng thay đổi ý định mua hàng:
            <ul className="return-sublist">
              <li>• Sản phẩm phải còn trong điều kiện tốt (không vỡ hỏng hóc), còn nguyên tem/nhãn không bị móp, rách và có thể bán lại được.</li>
              <li>• Các bộ phận, phụ kiện chi tiết khác đính kèm sản phẩm, tem/ phiếu bảo hành, hướng dẫn kỹ thuật...phải còn đầy đủ và nguyên vẹn.</li>
              <li>• Sản phẩm không bị dính bẩn, trầy xước có dấu hiệu đã qua giặt tẩy hoặc có mùi lạ.</li>
            </ul>
          </li>
          <li>- Hàng khuyến mại tặng kèm, phiếu quà tặng, phiếu mua hàng (nếu có), được hoàn trả.</li>
        </ul>

        <Text strong className="return-section-title">
          3. Các trường hợp đổi/ trả.
        </Text>
        <div className="return-table-wrap">
          <Table 
            columns={tableColumns} 
            dataSource={tableData} 
            pagination={false} 
            bordered 
            size="middle"
          />
        </div>
        <div className="return-footer-note">
          <Text>Trong mọi trường hợp, {storeName} sẽ không hoàn lại Mã giảm giá mà Khách hàng đã sử dụng để thanh toán cho đơn hàng đó.</Text>
        </div>
      </div>
    </div>
  );
};

export default ReturnPage;
