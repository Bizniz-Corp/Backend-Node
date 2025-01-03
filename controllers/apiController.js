const db = require('../config/db');
const session = require('express-session');
const axios = require('axios');

// 1. getSalesTransaction - Mendapatkan data sales transaction berdasarkan umkm_id
const getSalesTransaction = (req, res) => {
    const { umkmId } = req.params;

    const query = `
        SELECT st.sales_date, st.product_id, st.sales_quantity, st.price_per_item, st.total 
        FROM sales_transactions st
        JOIN products p ON st.product_id = p.product_id
        WHERE p.umkm_id = ? 
        ORDER BY st.sales_date ASC
    `;

    db.query(query, [umkmId], (err, results) => {
        if (err) {
            console.error('Error fetching sales transactions:', err);
            return res.status(500).send('Database query error');
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No sales transactions found for this UMKM' });
        }

        req.session.PureSalesTransactions = results;
        req.session.endDate = results[results.length - 1].sales_date;

        return res.json(results);
    });
};

// 2. getSalesTransactionAggregatByDayPure - Mengambil data agregat transaksi berdasarkan tanggal
const getSalesTransactionAggregatByDayPure = (req, res) => {
    if (!req.session.PureSalesTransactions) {
        const { umkmId } = req.params;
        const query = `
            SELECT st.sales_date, st.product_id, st.sales_quantity, st.price_per_item, st.total 
            FROM sales_transactions st
            JOIN products p ON st.product_id = p.product_id
            WHERE p.umkm_id = ? 
            ORDER BY st.sales_date ASC
        `;

        db.query(query, [umkmId], (err, results) => {
            if (err) {
                console.error('Error fetching sales transactions:', err);
                return res.status(500).send('Database query error');
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'No sales transactions found for this UMKM' });
            }

            req.session.PureSalesTransactions = results;
            req.session.endDate = results[results.length - 1].sales_date;

            return aggregateSalesTransactions(req, res);
        });
    } else {
        return aggregateSalesTransactions(req, res);
    }
};

const aggregateSalesTransactions = (req, res) => {
    const salesData = req.session.PureSalesTransactions;
    const aggregatedData = salesData.reduce((acc, curr) => {
        const salesDate = new Date(curr.sales_date);
        const date = salesDate.toISOString().split('T')[0]; // Ambil hanya tanggal
        if (!acc[date]) {
            acc[date] = { total: 0 };
        }
        acc[date].total += curr.total;
        return acc;
    }, {});

    const result = Object.keys(aggregatedData).map(date => ({
        date,
        total: aggregatedData[date].total
    }));

    req.session.PureSalesTransactionsAggregatByDay = result;

    return res.json(result);
};

// 3. getForecast - Mendapatkan prediksi dari model
const getForecast = async (req, res) => {
    const { umkmId, numDays } = req.body;

    if (!req.session.PureSalesTransactions) {
        const query = `
            SELECT st.sales_date, st.product_id, st.sales_quantity, st.price_per_item, st.total 
            FROM sales_transactions st
            JOIN products p ON st.product_id = p.product_id
            WHERE p.umkm_id = ? 
            ORDER BY st.sales_date ASC
        `;

        db.query(query, [umkmId], async (err, results) => {
            if (err) {
                console.error('Error fetching sales transactions:', err);
                return res.status(500).send('Database query error');
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'No sales transactions found for this UMKM' });
            }

            req.session.PureSalesTransactions = results;
            req.session.endDate = results[results.length - 1].sales_date; // Simpan tanggal terakhir

            return await forecastSalesTransactions(req, res, numDays);
        });
    } else {
        return await forecastSalesTransactions(req, res, numDays);
    }
};

// Fungsi untuk melakukan prediksi
const forecastSalesTransactions = async (req, res, numDays) => {
    try {
        const forecastResponse = await axios.post('http://127.0.0.1:8000/forecast', {
            data: req.session.PureSalesTransactions, 
            num_days: numDays
        });

        req.session.PureSalesTransactionsForecast = forecastResponse.data.forecast;

        return res.json(forecastResponse.data.forecast);
    } catch (error) {
        console.error('Error in forecasting:', error);
        return res.status(500).send('Error in forecasting');
    }
};

module.exports = {
    getSalesTransaction,
    getSalesTransactionAggregatByDayPure,
    getForecast
};