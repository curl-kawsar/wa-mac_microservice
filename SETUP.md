# Next.js + MongoDB + BullMQ Docker Setup

This project is a full-stack Next.js application with MongoDB database and BullMQ queue system, fully dockerized.

## Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# MongoDB Connection
MONGODB_URI=mongodb://admin:password@localhost:27017/nextjs-app?authSource=admin

# Redis Connection (for BullMQ)
REDIS_URL=redis://localhost:6379

# For local development without Docker:
# MONGODB_URI=mongodb://localhost:27017/nextjs-app
# REDIS_URL=redis://localhost:6379

# For production:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nextjs-app?retryWrites=true&w=majority
# REDIS_URL=redis://your-redis-host:6379
```

## Quick Start

1. **Clone and Setup**
   ```bash
   # Already done: npx create-next-app@latest my-app --yes
   cd my-app
   ```

2. **Create Environment File**
   ```bash
   # Create .env.local with MongoDB and Redis URIs
   echo "MONGODB_URI=mongodb://admin:password@localhost:27017/nextjs-app?authSource=admin" > .env.local
   echo "REDIS_URL=redis://localhost:6379" >> .env.local
   ```

3. **Run with Docker**
   ```bash
   # Build and start all services
   docker-compose up --build
   
   # Or run in detached mode
   docker-compose up --build -d
   ```

4. **Access the Application**
   - **Next.js App**: http://localhost:3000
   - **MongoDB Express**: http://localhost:8081 (MongoDB admin interface)
   - **BullMQ Dashboard**: Built into the main app (Queue monitoring and management)
   - **API Endpoints**: 
     - GET http://localhost:3000/api/users
     - POST http://localhost:3000/api/users
     - GET http://localhost:3000/api/queues
     - POST http://localhost:3000/api/jobs/email
     - POST http://localhost:3000/api/jobs/user
     - POST http://localhost:3000/api/jobs/export
     - POST http://localhost:3000/api/jobs/notification

## Development Mode (without Docker)

If you prefer to run without Docker:

```bash
# Install dependencies
npm install

# Create .env.local with local MongoDB URI
echo "MONGODB_URI=mongodb://localhost:27017/nextjs-app" > .env.local

# Start development server
npm run dev
```

## API Usage

### Get All Users
```bash
curl http://localhost:3000/api/users
```

### Create a New User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## Services

- **nextjs-app**: The Next.js application with BullMQ workers (port 3000)
- **mongo**: MongoDB database (port 27017)
- **mongo-express**: Web-based MongoDB admin interface (port 8081)
- **redis**: Redis server for BullMQ queues (port 6379)

## BullMQ Queue Features

This application includes a comprehensive queue system with the following job types:

### 📧 **Email Jobs**
- Send emails with different priorities (low, normal, high, urgent)
- Support for email templates
- Automatic retry on failure
- API: `POST /api/jobs/email`

### 👤 **User Processing Jobs**
- Welcome email automation
- Profile verification processes
- Account cleanup tasks
- Data backup operations
- API: `POST /api/jobs/user`

### 📊 **Data Export Jobs**
- Export data in multiple formats (JSON, CSV, XLSX, PDF)
- Custom filtering support
- Large file processing
- API: `POST /api/jobs/export`

### 🔔 **Notification Jobs**
- Multi-channel notifications (email, SMS, push, in-app)
- Scheduled notifications
- Priority-based delivery
- API: `POST /api/jobs/notification`

### 📈 **Queue Management**
- Real-time queue statistics
- Job monitoring and retry
- Failed job inspection
- Interactive queue dashboard in the main app
- Queue API at http://localhost:3000/api/queues

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (this will delete all data)
docker-compose down -v
```
