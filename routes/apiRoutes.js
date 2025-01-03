const express = require('express');
const router = express.Router();
const { getProducts, getTransactions } = require('../controllers/apiController');

router.get('/products', getProducts);
router.get('/transactions', getTransactions);

module.exports = router;
