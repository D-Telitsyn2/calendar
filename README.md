# Calendar Application

A web-based calendar application for managing employee vacation schedules and viewing holidays.

## Features

- Employee vacation scheduling and management
- Holiday tracking
- User authentication
- Responsive design

## Technology Stack

- React
- TypeScript
- Vite
- Firebase (Authentication & Firestore)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/calendar.git
   cd calendar
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up Firebase configuration
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication and Firestore
   - Add your Firebase configuration to `src/services/firebase.ts`

4. Start the development server
   ```
   npm run dev
   ```

## Usage

After starting the development server, open your browser and navigate to http://localhost:5173 (or the port specified in your terminal).

### Authentication

- Register a new account or log in with existing credentials
- The app uses Firebase Authentication for user management

### Managing Vacation Schedules

- Add, edit, or delete vacation entries for employees
- View vacation schedules in the calendar view

## Project Structure

- `src/components` - React components
- `src/services` - Firebase and other service integrations
- `src/utils` - Utility functions for dates, holidays, etc.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
