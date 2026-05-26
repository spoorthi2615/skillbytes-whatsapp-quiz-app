import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamSelection from './pages/ExamSelection';
import QuizSession from './pages/QuizSession';
import Results from './pages/Results';
import Analytics from './pages/Analytics';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exams" element={<ExamSelection />} />
        <Route path="/quiz/:chapterId" element={<QuizSession />} />
        <Route path="/results/:sessionId" element={<Results />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </div>
  );
}

export default App;
