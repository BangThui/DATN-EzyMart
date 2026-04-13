const fs = require('fs');
const path = require('path');

const srcPagesDir = 'c:/Users/Acer/Downloads/XDPTPM_test/frontend-react/src/pages';

const pages = ['Cart', 'Category', 'Checkout', 'Home', 'Orders', 'ProductDetail', 'Search', 'UserProfile'];

pages.forEach(page => {
    const pageDir = path.join(srcPagesDir, page);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir);
    
    const jsxPathOld = path.join(srcPagesDir, `${page}.jsx`);
    const cssPathOld = path.join(srcPagesDir, `${page}.css`);
    const jsxPathNew = path.join(pageDir, `${page}.jsx`);
    const cssPathNew = path.join(pageDir, `${page}.css`);
    
    if (fs.existsSync(jsxPathOld)) {
        let content = fs.readFileSync(jsxPathOld, 'utf8');
        content = content.replace(/from\s+['"]\.\.\//g, "from '../../");
        fs.writeFileSync(jsxPathOld, content);
        fs.renameSync(jsxPathOld, jsxPathNew);
        console.log(`Moved ${page}.jsx`);
    }
    
    if (fs.existsSync(cssPathOld)) {
        fs.renameSync(cssPathOld, cssPathNew);
        console.log(`Moved ${page}.css`);
    }
});

const adminPagesDir = path.join(srcPagesDir, 'admin');
const adminPages = ['AdminCategories', 'AdminCustomers', 'AdminLogin', 'AdminOrders', 'AdminProducts', 'Dashboard'];

adminPages.forEach(page => {
    const pageDir = path.join(adminPagesDir, page);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir);
    
    const jsxPathOld = path.join(adminPagesDir, `${page}.jsx`);
    const cssPathOld = path.join(adminPagesDir, `${page}.css`);
    const jsxPathNew = path.join(pageDir, `${page}.jsx`);
    const cssPathNew = path.join(pageDir, `${page}.css`);
    
    if (fs.existsSync(jsxPathOld)) {
        let content = fs.readFileSync(jsxPathOld, 'utf8');
        // Fix imports that go 2 levels up
        content = content.replace(/from\s+['"]\.\.\/\.\.\//g, "from '../../../");
        // Fix imports that go 1 level up (if any, although previous line might have caught them, but let's be careful not to double replace)
        // Actually, if we use a regex that exactly matches "../" but not "../../" it is safer.
        content = content.replace(/from\s+['"]\.\.\/(?!\.\.)/g, "from '../../");
        content = content.replace(/import\s+['"]\.\/Admin\.css['"]/, "import '../Admin.css'");
        content = content.replace(/import\s+['"]\.\/AdminLogin\.css['"]/, "import './AdminLogin.css'");
        
        fs.writeFileSync(jsxPathOld, content);
        fs.renameSync(jsxPathOld, jsxPathNew);
        console.log(`Moved ${page}.jsx (Admin)`);
    }
    
    if (fs.existsSync(cssPathOld)) {
        fs.renameSync(cssPathOld, cssPathNew);
        console.log(`Moved ${page}.css (Admin)`);
    }
});
