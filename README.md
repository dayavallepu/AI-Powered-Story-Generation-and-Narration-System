# Storybook React App

This folder contains the front-end React application for the AI-Powered Story Generation and Narration System.

## Features

- User authentication (register/login) with username, password, mobile, and Gmail
- Story generation form with genre, age, characters, and theme selection
- Multilingual support for story titles, content, and moral (English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, French, etc.)
- Story narration (text-to-speech) in English and supported languages
- Story readability (Flesch Score) and feedback interface
- Responsive and visually appealing UI

## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the `Deployment/storybook` directory, you can run:

- **`npm install`**  
  Installs all dependencies.

- **`npm start`**  
  Runs the app in development mode.  
  Open [http://localhost:3000](http://localhost:3000) to view it in your browser.  
  The page will reload when you make changes.

- **`npm test`**  
  Launches the test runner in interactive watch mode.

- **`npm run build`**  
  Builds the app for production to the `build` folder.  
  It correctly bundles React in production mode and optimizes the build for the best performance.

- **`npm run eject`**  
  **Note:** This is a one-way operation. Once you `eject`, you can't go back!  
  It will copy all configuration files and dependencies into your project so you have full control.

## Deployment

See the official [Create React App deployment guide](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)

---

# Deployment Folder

This folder contains deployment-related resources for the AI-Powered Story Generation and Narration System project.

## Structure

- **storybook/**  
  Front-end React application for user interaction, story generation, and narration.

- **Other deployment scripts or configs**  
  (Add details here if you have Dockerfiles, CI/CD scripts, or other deployment assets.)

## How to Deploy
 
### 1. Storybook React App

Navigate to the `storybook` directory and follow these steps:

```bash
cd storybook
npm install (if not installed)
npm start
```

- The app will be available at [http://localhost:3000](http://localhost:3000).
- For production, use `npm run build`.

### 2. Backend/API

- The backend (Jupyter Notebook or Python API) should be running and accessible to the front-end.
- Ensure your API endpoints and authentication are properly configured.
```bash
cd Deployment
Python app.py
```
## Requirements

- Node.js and npm for the React front-end.
- Python 3.10+ and required libraries for the backend (see main project requirements.txt).

## Notes

- All JavaScript dependencies for the front-end are managed via `package.json` in the `storybook` folder.
- No Python requirements are needed for the front-end.
- For deployment to cloud or production, refer to your organization's deployment guidelines or add Docker/CI-CD scripts as needed.

**Note:**  
This front-end is intended to be used with the AI-powered story generation backend (see the main project directory for details on the backend and API usage).
