const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:cart_id', cartController.updateCartItem);
router.delete('/clear', cartController.clearCart);
router.delete('/:cart_id', cartController.removeFromCart);

module.exports = router;
