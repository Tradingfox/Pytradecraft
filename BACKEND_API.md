# Backend API Documentation

This document describes the REST API endpoints provided by the PyTradeCraft backend server.

## Base URL

```
http://localhost:3001/api
```

## Health Check

### GET /api/health

Check if the server is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T20:33:45.374Z",
  "version": "1.0.0",
  "database": "connected"
}
```

## Algorithms API

### GET /api/algorithms

List all algorithms for the authenticated user with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10, max: 100)

**Response:**
```json
{
  "algorithms": [
    {
      "id": "uuid",
      "name": "My Algorithm",
      "code": "algorithm code...",
      "description": "Algorithm description",
      "createdAt": "2025-10-12T20:00:00.000Z",
      "updatedAt": "2025-10-12T20:00:00.000Z"
    }
  ],
  "totalItems": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

### POST /api/algorithms

Create a new algorithm.

**Request Body:**
```json
{
  "name": "My Algorithm",
  "code": "algorithm code...",
  "description": "Algorithm description"
}
```

**Response:** (201 Created)
```json
{
  "id": "uuid",
  "name": "My Algorithm",
  "code": "algorithm code...",
  "description": "Algorithm description",
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:00:00.000Z"
}
```

### GET /api/algorithms/:id

Get a specific algorithm by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "My Algorithm",
  "code": "algorithm code...",
  "description": "Algorithm description",
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:00:00.000Z"
}
```

### PUT /api/algorithms/:id

Update an existing algorithm.

**Request Body:**
```json
{
  "name": "Updated Algorithm Name",
  "code": "updated code...",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Updated Algorithm Name",
  "code": "updated code...",
  "description": "Updated description",
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:30:00.000Z"
}
```

### DELETE /api/algorithms/:id

Delete an algorithm.

**Response:** (204 No Content)

### POST /api/algorithms/:algorithmId/backtests

Save a backtest result for an algorithm.

**Request Body:**
```json
{
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "initialCapital": 10000,
  "finalEquity": 12000,
  "parameters": {
    "param1": "value1"
  },
  "results": {
    "trades": []
  },
  "metrics": {
    "totalReturn": 20,
    "sharpeRatio": 1.5
  }
}
```

**Response:** (201 Created)

### GET /api/algorithms/:algorithmId/backtests

Get all backtest results for an algorithm.

**Response:**
```json
[
  {
    "id": "uuid",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.000Z",
    "initialCapital": 10000,
    "finalEquity": 12000,
    "parameters": {},
    "results": {},
    "metrics": {},
    "generatedAt": "2025-10-12T20:00:00.000Z"
  }
]
```

## Deployments API

### GET /api/deployments

Get all deployments for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "algorithmId": "algorithm-uuid",
    "algorithmName": "My Algorithm",
    "accountId": "account-id",
    "status": "running",
    "parameters": {},
    "createdAt": "2025-10-12T20:00:00.000Z",
    "updatedAt": "2025-10-12T20:00:00.000Z"
  }
]
```

### POST /api/deployments

Create a new deployment.

**Request Body:**
```json
{
  "algorithmId": "algorithm-uuid",
  "accountId": "account-id",
  "parameters": {
    "param1": "value1"
  }
}
```

**Response:** (201 Created)
```json
{
  "id": "uuid",
  "algorithmId": "algorithm-uuid",
  "algorithmName": "My Algorithm",
  "accountId": "account-id",
  "status": "pending",
  "parameters": {},
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:00:00.000Z"
}
```

### GET /api/deployments/:id

Get a specific deployment.

**Response:**
```json
{
  "id": "uuid",
  "algorithmId": "algorithm-uuid",
  "algorithmName": "My Algorithm",
  "accountId": "account-id",
  "status": "running",
  "parameters": {},
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:00:00.000Z"
}
```

### GET /api/deployments/:id/status

Get the status of a deployment.

**Response:**
```json
{
  "status": "running",
  "lastUpdated": "2025-10-12T20:30:00.000Z"
}
```

### PUT /api/deployments/:id

Update a deployment.

**Request Body:**
```json
{
  "status": "stopped",
  "parameters": {
    "param1": "new-value"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "algorithmId": "algorithm-uuid",
  "algorithmName": "My Algorithm",
  "accountId": "account-id",
  "status": "stopped",
  "parameters": {},
  "createdAt": "2025-10-12T20:00:00.000Z",
  "updatedAt": "2025-10-12T20:35:00.000Z"
}
```

### DELETE /api/deployments/:id

Delete a deployment.

**Response:** (204 No Content)

### GET /api/deployments/:id/logs

Get logs for a specific deployment.

**Query Parameters:**
- `limit` (optional): Maximum number of logs to return (default: 100)
- `level` (optional): Filter by log level (info, warning, error)

**Response:**
```json
[
  {
    "id": "uuid",
    "deploymentId": "deployment-uuid",
    "message": "Deployment initiated",
    "level": "info",
    "timestamp": "2025-10-12T20:00:00.000Z"
  }
]
```

### POST /api/deployments/:id/logs

Add a log entry for a deployment.

**Request Body:**
```json
{
  "message": "Trade executed",
  "level": "info"
}
```

**Response:** (201 Created)

## Account-Specific Deployments

### GET /api/accounts/:accountId/deployments

Get all deployments for a specific account.

**Response:**
```json
[
  {
    "id": "uuid",
    "algorithmId": "algorithm-uuid",
    "algorithmName": "My Algorithm",
    "accountId": "account-id",
    "status": "running",
    "parameters": {},
    "createdAt": "2025-10-12T20:00:00.000Z",
    "updatedAt": "2025-10-12T20:00:00.000Z"
  }
]
```

## Algorithm-Specific Deployments

### GET /api/algorithms/:algorithmId/deployments

Get all deployments for a specific algorithm.

**Response:**
```json
[
  {
    "id": "uuid",
    "algorithmId": "algorithm-uuid",
    "algorithmName": "My Algorithm",
    "accountId": "account-id",
    "status": "running",
    "parameters": {},
    "createdAt": "2025-10-12T20:00:00.000Z",
    "updatedAt": "2025-10-12T20:00:00.000Z"
  }
]
```

## Authentication

Currently, the API uses a placeholder authentication middleware that simulates a user with ID 1. In a production environment, you should:

1. Implement proper JWT or session-based authentication
2. Require authentication tokens in the `Authorization` header
3. Validate tokens and extract user information
4. Protect all endpoints with the authentication middleware

Example header for production:
```
Authorization: Bearer your-jwt-token-here
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Rate Limiting

Currently, there is no rate limiting implemented. For production use, consider adding rate limiting middleware to prevent abuse.

## CORS

The server is configured to accept requests from all origins in development. For production, configure CORS to only allow requests from your frontend domain.
