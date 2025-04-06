# Advanced Todo Application

A feature-rich Todo List application with calendar integration, advanced task management capabilities, and local data persistence.

## Features

### Core Features
- Create, edit, delete, and view todos with titles, descriptions, and due dates
- Mark tasks as completed
- Filter and sort tasks by various criteria
- Responsive design for desktop and mobile devices

### Advanced Features
- **Calendar View**: Monthly, weekly, and daily views similar to Google Calendar
- **Categories**: Organize tasks into custom categories
- **Tags**: Add multiple tags to tasks for better organization
- **Priorities**: Set importance levels for better task management
- **Recurring Tasks**: Create tasks that repeat on a schedule
- **Subtasks**: Break down complex tasks into smaller, manageable parts
- **Time Tracking**: Monitor time spent on tasks
- **Templates**: Save and reuse task templates for common activities
- **Statistics**: View insights about your productivity and task completion
- **Dark/Light Mode**: Toggle between visual themes

## Technology Stack

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (based on Radix UI)
- **State Management**: Zustand
- **Data Storage**: IndexedDB for client-side persistence
- **Date Handling**: date-fns for date manipulation

## Installation

```bash
# Clone the repository (if applicable)
git clone <repository-url>
cd todo-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

### Task Management
- **Creating Tasks**: Click the "Add Todo" button to create a new task
- **Editing Tasks**: Click on a task to view and edit its details
- **Completing Tasks**: Check the checkbox next to a task to mark it as complete
- **Filtering Tasks**: Use the filter controls to find tasks by status, category, priority, etc.

### Calendar Usage
- **Switching Views**: Toggle between month, week, and day views
- **Adding Events**: Click on a time slot to add a new task at that time
- **Viewing Events**: Click on an event in the calendar to see details

### Categories and Tags
- **Managing Categories**: Use the Categories view to create and edit categories
- **Adding Tags**: When creating or editing a task, type and press Enter to add tags

### Templates
- **Creating Templates**: Save frequently used task configurations as templates
- **Using Templates**: Select a template when creating a new task to pre-fill details

## Data Storage

The application uses IndexedDB to store all data locally in your browser. No data is sent to external servers, ensuring privacy and offline functionality.

## Development

### Project Structure
- `/src/components`: UI components
- `/src/db`: Database configuration and access
- `/src/store`: Zustand state management
- `/src/lib`: Utility functions and hooks

### Building for Production
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.