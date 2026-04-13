const http = require('http');

let body = '--------------------------1234\r\nContent-Disposition: form-data; name="product_name"\r\n\r\nEdited Via HTTP!\r\n--------------------------1234\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n80\r\n--------------------------1234\r\nContent-Disposition: form-data; name="variants"\r\n\r\n[{"variant_id": 74, "variant_name":"Edited Variant HTTP","variant_price":99000,"variant_quantity":10}]\r\n--------------------------1234--\r\n';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/products/89',
  method: 'PUT',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=------------------------1234',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, res => {
  let d = '';
  res.on('data', c => d+=c);
  res.on('end', () => console.log('HTTP PUT STATUS:', res.statusCode, d));
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
