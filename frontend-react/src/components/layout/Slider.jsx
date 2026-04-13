import React from 'react';

const Slider = () => {
  return (
    <div id="carouselExampleIndicators" className="carousel slide" data-ride="carousel">
        <ol className="carousel-indicators">
            <li data-target="#carouselExampleIndicators" data-slide-to="0" className="active"></li>
            <li data-target="#carouselExampleIndicators" data-slide-to="1"></li>
            <li data-target="#carouselExampleIndicators" data-slide-to="2"></li>
            <li data-target="#carouselExampleIndicators" data-slide-to="3"></li>
        </ol>
        <div className="carousel-inner">
            <div className="carousel-item item1 active">
                <div className="container">
                    <div className="w3l-space-banner">
                        <div className="carousel-caption p-lg-5 p-sm-4 p-3">
                            <p>
                                <span>10%</span> tất cả các loại trái cây
                            </p>
                            <h3 className="font-weight-bold pt-2 pb-lg-5 pb-4">
                               Giảm giá<span>lớn</span>
                            </h3>
                            <a className="button2" href="#">Mua ngay</a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="carousel-item item2">
                <div className="container">
                    <div className="w3l-space-banner">
                        <div className="carousel-caption p-lg-5 p-sm-4 p-3">
                            <p>
                                <span>Siêu sale</span> mùa hè
                            </p>
                            <h3 className="font-weight-bold pt-2 pb-lg-5 pb-4">Nước ép
                                <span>nguyên chất</span>
                            </h3>
                            <a className="button2" href="#">Mua ngay</a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="carousel-item item3">
                <div className="container">
                    <div className="w3l-space-banner">
                        <div className="carousel-caption p-lg-5 p-sm-4 p-3">
                            <p>Nhận ngay
                                <span>10%</span> hoàn tiền
                            </p>
                            <h3 className="font-weight-bold pt-2 pb-lg-5 pb-4">SẢN PHẨM
                                <span>MỚI</span>
                            </h3>
                            <a className="button2" href="#">Mua ngay </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="carousel-item item4">
                <div className="container">
                    <div className="w3l-space-banner">
                        <div className="carousel-caption p-lg-5 p-sm-4 p-3">
                            <p>Nhận ngay
                                <span>40%</span> giảm giá các loại rau củ
                            </p>
                            <h3 className="font-weight-bold pt-2 pb-lg-5 pb-4">SUMMER
                                <span>GIẢM GIÁ</span>
                            </h3>
                            <a className="button2" href="/">Mua ngay </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <a className="carousel-control-prev" href="#carouselExampleIndicators" role="button" data-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="sr-only">Previous</span>
        </a>
        <a className="carousel-control-next" href="#carouselExampleIndicators" role="button" data-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="sr-only">Next</span>
        </a>
    </div>
  );
};

export default Slider;
