const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Cache setup with TTL of 30 seconds to balance freshness and performance
const stockCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

// Configuration
const API_BASE_URL = 'http://20.244.56.144/evaluation-service';
let authToken = '';

// Auth credentials
const authCredentials = {
    "email":"shipra.2226cseml1033@kiet.edu",
    "name":"shipra maurya",
    "rollNo":"2200291530101",
    "accessCode":"SxVeja",
    "clientID":"1872d7d0-aabe-401a-8602-3bf1fed92d0e",
    "clientSecret":"TseccEwXkaNsQgmG"
    }

// Helper function to calculate time window
function getTimeWindow(minutes) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - minutes * 60000);
    return { now, windowStart };
}

// Authenticate and get token
async function authenticate() {
    try {
        console.log('Attempting authentication...');
        const response = await axios.post(`${API_BASE_URL}/auth`, authCredentials);
        authToken = response.data.access_token;
        console.log('Authentication successful');
        
        // Schedule token refresh before expiry
        const expiresIn = Math.min(response.data.expires_in - 300, 2147483); // Max timeout protection
        setTimeout(authenticate, expiresIn * 1000);
        return true;
    } catch (error) {
        console.error('Authentication failed:', error.message);
        setTimeout(authenticate, 60000); // Retry after 1 minute
        return false;
    }
}

// Configure axios with authorization header
function getAuthHeaders() {
    return {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    };
}

// Fetch stock price history with efficient caching
async function fetchStockPriceHistory(ticker, minutes) {
    const cacheKey = `stock_${ticker}_${minutes}`;
    const cachedData = stockCache.get(cacheKey);
    
    if (cachedData) {
        return cachedData;
    }
    
    if (!authToken) {
        await authenticate();
    }
    
    try {
        const url = `${API_BASE_URL}/stocks/${ticker}${minutes ? `?minutes=${minutes}` : ''}`;
        const response = await axios.get(url, getAuthHeaders());
        
        let priceHistory = minutes ? response.data : [response.data.stock];
        
        // Sort by timestamp and filter within the exact time window if minutes provided
        if (minutes) {
            const { windowStart } = getTimeWindow(minutes);
            priceHistory = priceHistory
                .filter(item => new Date(item.lastUpdatedAt) >= windowStart)
                .sort((a, b) => new Date(a.lastUpdatedAt) - new Date(b.lastUpdatedAt));
        }
        
        stockCache.set(cacheKey, priceHistory);
        return priceHistory;
    } catch (error) {
        console.error(`Error fetching ${ticker} data:`, error.message);
        if (error.response?.status === 401) {
            await authenticate();
            return fetchStockPriceHistory(ticker, minutes);
        }
        throw error;
    }
}

// Calculate average stock price
function calculateAverage(priceHistory) {
    if (!priceHistory?.length) return 0;
    const sum = priceHistory.reduce((total, item) => total + item.price, 0);
    return sum / priceHistory.length;
}

// Time-align price histories for correlation calculation
function alignPriceHistories(historyA, historyB) {
    if (!historyA.length || !historyB.length) return [[], []];
    
    // Create a map of timestamps to prices for efficient lookup
    const mapA = new Map();
    const mapB = new Map();
    
    historyA.forEach(item => mapA.set(item.lastUpdatedAt, item.price));
    historyB.forEach(item => mapB.set(item.lastUpdatedAt, item.price));
    
    // Get all unique timestamps
    const allTimestamps = new Set([
        ...historyA.map(item => item.lastUpdatedAt),
        ...historyB.map(item => item.lastUpdatedAt)
    ]);
    
    // Align prices at each timestamp
    const alignedA = [];
    const alignedB = [];
    
    Array.from(allTimestamps).sort().forEach(timestamp => {
        alignedA.push(mapA.get(timestamp) || alignedA[alignedA.length - 1] || 0);
        alignedB.push(mapB.get(timestamp) || alignedB[alignedB.length - 1] || 0);
    });
    
    return [alignedA, alignedB];
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(historyA, historyB) {
    const [pricesA, pricesB] = alignPriceHistories(historyA, historyB);
    const n = pricesA.length;
    
    if (n < 2) return 0; // Need at least 2 points
    
    // Calculate means
    const sumA = pricesA.reduce((a, b) => a + b, 0);
    const sumB = pricesB.reduce((a, b) => a + b, 0);
    const meanA = sumA / n;
    const meanB = sumB / n;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let varianceA = 0;
    let varianceB = 0;
    
    for (let i = 0; i < n; i++) {
        const diffA = pricesA[i] - meanA;
        const diffB = pricesB[i] - meanB;
        
        covariance += diffA * diffB;
        varianceA += diffA * diffA;
        varianceB += diffB * diffB;
    }
    
    covariance /= (n - 1);
    const stdDevA = Math.sqrt(varianceA / (n - 1));
    const stdDevB = Math.sqrt(varianceB / (n - 1));
    
    if (stdDevA === 0 || stdDevB === 0) return 0;
    
    const correlation = covariance / (stdDevA * stdDevB);
    return parseFloat(correlation.toFixed(4));
}

// API Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Stock Price Aggregation Microservice',
        endpoints: [
            '/stocks/:ticker?minutes=m&aggregation=average',
            '/stockcorrelation?minutes=m&ticker=TICKER1&ticker=TICKER2',
            '/health'
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        authenticated: !!authToken,
        timestamp: new Date().toISOString() 
    });
});

app.get('/stocks/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const minutes = parseInt(req.query.minutes) || null;
        const aggregation = req.query.aggregation || 'average';
        
        if (!minutes) {
            return res.status(400).json({ error: 'Minutes parameter is required' });
        }
        
        if (aggregation !== 'average') {
            return res.status(400).json({ error: 'Only average aggregation is supported' });
        }
        
        const priceHistory = await fetchStockPriceHistory(ticker, minutes);
        const average = calculateAverage(priceHistory);
        
        res.json({
            averageStockPrice: average,
            priceHistory
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/stockcorrelation', async (req, res) => {
    try {
        const minutes = parseInt(req.query.minutes) || null;
        let tickers = req.query.ticker;
        
        if (!Array.isArray(tickers)) {
            tickers = [tickers];
        }
        
        if (!minutes) {
            return res.status(400).json({ error: 'Minutes parameter is required' });
        }
        
        if (tickers.length !== 2) {
            return res.status(400).json({ error: 'Exactly two tickers are required' });
        }
        
        const [ticker1, ticker2] = tickers;
        const [history1, history2] = await Promise.all([
            fetchStockPriceHistory(ticker1, minutes),
            fetchStockPriceHistory(ticker2, minutes)
        ]);
        
        const correlation = calculateCorrelation(history1, history2);
        
        res.json({
            correlation,
            stocks: {
                [ticker1]: {
                    averagePrice: calculateAverage(history1),
                    priceHistory: history1
                },
                [ticker2]: {
                    averagePrice: calculateAverage(history2),
                    priceHistory: history2
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    authenticate();
});