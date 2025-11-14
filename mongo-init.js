// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('nextjs-app');

// Create a user for the nextjs-app database
db.createUser({
  user: 'nextjs-user',
  pwd: 'nextjs-password',
  roles: [
    {
      role: 'readWrite',
      db: 'nextjs-app'
    }
  ]
});

// Create an initial collection with sample data
db.users.insertMany([
  {
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date()
  },
  {
    name: 'Jane Smith', 
    email: 'jane@example.com',
    createdAt: new Date()
  }
]);

print('Database initialized successfully!');
