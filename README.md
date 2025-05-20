# Online Evaluation/Examination/Test Platform

A fully integrated online platform designed to streamline the process of creating, conducting, and managing evaluations, examinations, or tests. This platform provides administrators with the ability to create various types of questions (e.g., multiple-choice, true/false, short answer) and track student performance with real-time data analysis.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **Admin Dashboard**: Create and manage exams, users (students, teachers), and evaluation settings.
- **Question Bank**: A rich repository for storing different types of questions for exams.
- **Real-time Monitoring**: Track student progress during the test in real time.
- **Automatic Grading**: Automatically grade objective-type questions (multiple-choice, true/false).
- **Customizable Timer**: Set a specific time limit for each test or question.
- **Result Analysis**: Generate detailed reports on student performance, including scores, time taken, and error analysis.
- **User Roles**: Different roles with varying levels of access (Admin, Teacher, Student).
- **Secure Exam Environment**: Prevention of cheating through various measures (e.g., browser lockdown, random question order).
- **Notifications**: Automatic notifications to students about exam schedules, results, and deadlines.
- **Mobile-Friendly**: Designed to work seamlessly across different devices, including mobile phones and tablets.

## Installation

### Prerequisites

- Node.js and npm (for backend development)
- A database like MongoDB or MySQL (depending on your configuration)
- A web server (e.g., Apache, Nginx) if deploying on production
- A browser for testing (Chrome, Firefox, etc.)

### Steps to Install

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/online-evaluation-platform.git
   ```

2. Install the required dependencies:

   ```bash
   cd online-evaluation-platform
   npm install
   ```

3. Set up the database:

   - If using MongoDB, ensure it's installed and running. You can configure it in the `.env` file.
   - If using MySQL, make sure the database is set up and connected.

4. Configure environment variables:

   - Create a `.env` file and configure the necessary variables like database connection, JWT secret, etc.

   Example `.env` file:

   ```
   DATABASE_URL=mongodb://localhost:27017/evaluation_db
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

5. Run the application:

   ```bash
   npm start
   ```

6. Visit `http://localhost:3000` in your browser to access the platform.

## Usage

### Admin Features

- **Create Exam**: Admins can create new exams, set durations, and add questions.
- **Manage Users**: Add students and teachers, assign roles, and manage permissions.
- **View Reports**: Generate reports on student performance.

### Teacher Features

- **Create and Assign Exams**: Teachers can assign existing exams to students.
- **View Results**: Teachers can view individual student performance and overall exam statistics.

### Student Features

- **Take Exams**: Students can access exams assigned to them by their teachers.
- **View Results**: After completion, students can view their scores and feedback.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (React.js)
- **Backend**: Node.js, Express
- **Database**: MongoDB / MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Docker, Kubernetes (optional)

## Contributing

We welcome contributions to enhance the platform. To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature-branch`)
6. Create a new pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Inspired by online learning platforms like Moodle, Blackboard, and Google Forms.
- Special thanks to the contributors who help improve this platform.
