const express = require('express');
const router = express.Router();
const {
    getSalesTransaction,
    getSalesTransactionAggregatByDayPure,
    getForecast
} = require('../controllers/apiController');

router.get('/sales-transactions/:umkmId', getSalesTransaction);

router.get('/sales-transactions/aggregate-by-day/:umkmId', getSalesTransactionAggregatByDayPure);

router.post('/forecast', getForecast);

module.exports = router;
