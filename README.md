# Stock Price Aggregation Microservice

![Architecture Diagram]()

## Overview

This microservice provides real-time stock market insights by aggregating data from stock exchange APIs. It delivers critical metrics such as average stock prices and correlation between stocks to help market participants make informed decisions.

## Features

- **Average Stock Price**: Calculate the average price of a stock over a specified time period
- **Price Correlation**: Determine the correlation coefficient between two stocks' price movements
- **High Performance**: Optimized data storage and retrieval for responsive user experience
- **Caching System**: Minimizes external API calls while maintaining data freshness

## API Endpoints

### Average Stock Price

```
GET /stocks/:ticker?minutes=m&aggregation=average
```

Retrieves the average price of a specified stock over the last 'm' minutes.

**Parameters:**
- `ticker` (path): Stock ticker symbol (e.g., NVDA, AAPL)
- `minutes` (query): Time window in minutes
- `aggregation` (query): Type of aggregation (currently only 'average' is supported)

**Response Example:**
```json
{
    "averageStockPrice": 453.569744,
    "priceHistory": [
        {
            "price": 231.95296,
            "lastUpdatedAt": "2025-05-08T04:26:27.4658491Z"
        },
        {
            "price": 124.95156,
            "lastUpdatedAt": "2025-05-08T04:30:23.465940341Z"
        },
        {
            "price": 459.09558,
            "lastUpdatedAt": "2025-05-08T04:39:14.464887447Z"
        },
        {
            "price": 998.27924,
            "lastUpdatedAt": "2025-05-08T04:50:03.464903606Z"
        }
    ]
}
```

### Stock Price Correlation

```
GET /stockcorrelation?minutes=m&ticker={TICKER1}&ticker={TICKER2}
```

Calculates the Pearson correlation coefficient between two stocks over the last 'm' minutes.

**Parameters:**
- `minutes` (query): Time window in minutes
- `ticker` (query, multiple): Two stock ticker symbols to compare (e.g., NVDA, PYPL)

**Response Example:**
```json
{
    "correlation": -0.9367,
    "stocks": {
        "NVDA": {
            "averagePrice": 204.000025,
            "priceHistory": [
                {
                    "price": 231.95296,
                    "lastUpdatedAt": "2025-05-08T04:26:27.4658491Z"
                },
                {
                    "price": 124.95156,
                    "lastUpdatedAt": "2025-05-08T04:30:23.465940341Z"
                },
                {
                    "price": 459.09558,
                    "lastUpdatedAt": "2025-05-08T04:39:14.464887447Z"
                },
                {
                    "price": 998.27924,
                    "lastUpdatedAt": "2025-05-08T04:50:03.464903606Z"
                }
            ]
        },
        "PYPL": {
            "averagePrice": 458.606756,
            "priceHistory": [
                {
                    "price": 680.59766,
                    "lastUpdatedAt": "2025-05-09T02:04:27.464908465Z"
                },
                {
                    "price": 652.6387,
                    "lastUpdatedAt": "2025-05-09T02:16:15.466525768Z"
                },
                {
                    "price": 42.583908,
                    "lastUpdatedAt": "2025-05-09T02:23:08.465127888Z"
                }
            ]
        }
    }
}
```

## Architecture

![Data Flow Diagram](images/data-flow.png)

The microservice uses a multi-layered architecture:

1. **API Layer**: Handles incoming HTTP requests and response formatting
2. **Service Layer**: Contains business logic for calculations and data processing
3. **Repository Layer**: Manages data access and caching
4. **External API Client**: Communicates with the stock exchange API

## Implementation Details

### Correlation Calculation

The service uses Pearson's correlation coefficient to measure the linear relationship between two stocks:

1. **Covariance**:
   ```
   cov(X,Y) = Σ[(Xi-X̄)(Yi-Ȳ)] / (n-1)
   ```

2. **Standard Deviation**:
   ```
   σX = √[Σ(Xi-X̄)² / (n-1)]
   ```

3. **Correlation Coefficient**:
   ```
   ρ = cov(X,Y) / (σXσY)
   ```

### Caching Strategy

The service implements a time-based caching mechanism that:
- Stores frequently accessed stock data
- Refreshes data automatically when it becomes stale
- Uses a sliding window approach to maintain only relevant historical data

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Docker (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stock-price-aggregation.git
   cd stock-price-aggregation
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure the environment:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file to set your stock exchange API endpoint.

4. Start the service:
   ```
   npm start
   ```

### Docker Deployment

```
docker build -t stock-microservice .
docker run -p 3000:3000 stock-microservice
```

## API Rate Limiting

To prevent excessive calls to the stock exchange API, this service implements:

- Request throttling
- Batch processing of related requests
- Smart caching with configurable TTL (Time To Live)

## Error Handling

The service provides comprehensive error handling:

- Graceful degradation when the stock exchange API is unavailable
- Informative error messages with appropriate HTTP status codes
- Automatic retry for transient failures

## Testing

Run the test suite with:

```
npm test
```

The project includes:
- Unit tests for business logic
- Integration tests for API endpoints
- Load tests to verify performance under stress

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Stock exchange API documentation and support team
- Performance optimization guidelines from [reference source]
