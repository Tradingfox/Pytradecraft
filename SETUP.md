# PyTradeCraft Setup Guide

This guide will help you get PyTradeCraft up and running on your local machine.

## Prerequisites

- **Node.js** (v16 or higher): [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning the repository)

## Installation Steps

### 1. Clone or Download the Repository

```bash
git clone https://github.com/Tradingfox/Pytradecraft.git
cd Pytradecraft
```

Or download and extract the ZIP file from GitHub.

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies for both frontend and backend.

### 3. Configure Environment Variables

The `.env.local` file will be automatically created from `.env.local.example` during installation. You need to add your API keys:

1. Open `.env.local` in your text editor
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

**Getting a Gemini API Key:**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Sign in with your Google account
- Create a new API key
- Copy and paste it into your `.env.local` file

### 4. Start the Application

You have several options for running the application:

#### Option A: Run Both Frontend and Backend Together (Recommended for Development)

```bash
npm run dev:full
```

This starts:
- Frontend development server on `http://localhost:5173`
- Backend API server on `http://localhost:3001`

#### Option B: Run Backend Only

```bash
npm start
# or
npm run server
```

The backend serves both the API and the built frontend from `http://localhost:3001`.

#### Option C: Use Convenience Scripts

**On Linux/Mac:**
```bash
./start-backend.sh
```

**On Windows:**
```bash
start-backend.bat
```

These scripts will:
- Check if dependencies are installed
- Create `.env.local` if it doesn't exist
- Check if port 3001 is available
- Start the backend server

### 5. Build for Production

To create a production build:

```bash
npm run build
```

This creates optimized files in the `dist` folder. To serve the production build:

```bash
npm start
```

Then visit `http://localhost:3001`

## Verifying Your Installation

### Check Backend Health

Once the backend is running, you can verify it's working:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T20:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

### Access the Application

- **Development mode**: `http://localhost:5173` (frontend) + `http://localhost:3001` (backend API)
- **Production mode**: `http://localhost:3001` (serves both frontend and API)

## Project Structure

```
Pytradecraft/
├── backend/                 # Backend server code
│   ├── config/             # Configuration files (database)
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── data/               # SQLite database files (auto-created)
│   └── server.cjs          # Express server entry point
├── components/             # React components
├── views/                  # React page components
├── services/              # Frontend API services
├── utils/                 # Utility functions
├── dist/                  # Production build output (auto-created)
├── node_modules/          # Dependencies (auto-created)
├── index.html             # HTML entry point
├── index.tsx              # React app entry point
├── package.json           # Project dependencies and scripts
├── vite.config.ts         # Vite configuration
├── .env.local             # Environment variables (created from example)
├── .env.local.example     # Environment variables template
└── README.md              # Project documentation
```

## Available Scripts

- `npm install` - Install dependencies
- `npm run dev` - Start frontend development server only
- `npm run server` - Start backend server only
- `npm run server:dev` - Start backend with auto-reload (using nodemon)
- `npm run dev:full` - Start both frontend and backend together
- `npm start` - Start backend server (production)
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build locally

## Database

PyTradeCraft uses **SQLite** for the database, which requires no additional setup. The database file is automatically created at:

```
backend/data/database.sqlite
```

The database schema is automatically synchronized when the server starts.

### Database Tables

- **Users**: User accounts (placeholder for authentication)
- **Algorithms**: Trading algorithms
- **BacktestResults**: Results from algorithm backtests
- **Deployments**: Algorithm deployments
- **DeploymentLogs**: Logs from deployments
- **KnowledgeGraphNodes**: Knowledge graph nodes (AI memory)
- **KnowledgeGraphEdges**: Relationships between knowledge nodes

## Troubleshooting

### Port Already in Use

If you see `Error: listen EADDRINUSE: address already in use :::3001`:

1. Check if another process is using port 3001:
   ```bash
   # On Linux/Mac:
   lsof -i :3001
   
   # On Windows:
   netstat -ano | findstr :3001
   ```

2. Kill the process or use a different port by setting `PORT` in `.env.local`:
   ```
   PORT=3002
   ```

### Missing Dependencies

If you encounter module errors:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Errors

If you encounter database errors:

1. Stop the server
2. Delete the database file:
   ```bash
   rm backend/data/database.sqlite
   ```
3. Restart the server (database will be recreated)

### Gemini API Errors

If AI features aren't working:

1. Verify your API key is correct in `.env.local`
2. Check your API key has not exceeded quota at [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Ensure the API key has proper permissions

## Development Tips

### Auto-reload Backend

Use `nodemon` for automatic backend reloading during development:

```bash
npm run server:dev
```

The server will automatically restart when you modify backend files.

### Debug Mode

Enable verbose logging by setting in `.env.local`:

```
NODE_ENV=development
```

### API Testing

Use tools like:
- **curl**: Command-line HTTP client
- **Postman**: GUI for API testing
- **Thunder Client**: VS Code extension for API testing

Example API request:
```bash
curl -X POST http://localhost:3001/api/algorithms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Algorithm",
    "code": "print(\"Hello World\")",
    "description": "A test algorithm"
  }'
```

## Next Steps

1. Read the [Backend API Documentation](BACKEND_API.md) to understand available endpoints
2. Check the [MCP Servers Documentation](MCP_SERVERS_DOCUMENTATION.md) for AI features
3. Explore the application at `http://localhost:3001`
4. Create your first trading algorithm
5. Run a backtest
6. Deploy to a trading account

## Getting Help

- Check existing documentation in the repository
- Review the code comments
- Open an issue on GitHub if you encounter problems

## Security Notes

- Never commit `.env.local` to version control
- Keep your API keys secret
- Use environment variables for sensitive data
- In production, implement proper authentication and HTTPS

## Contributing

When contributing to the project:

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

Happy trading! 🚀📈
