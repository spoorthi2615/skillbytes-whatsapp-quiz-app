import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExamSelection = lazy(() => import('./pages/ExamSelection'));
const QuizSession = lazy(() => import('./pages/QuizSession'));
const Results = lazy(() => import('./pages/Results'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <div className="app-container">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#202C33',
            color: '#E9EDEF',
            border: '1px solid #8696A0'
          }
        }} 
      />
      <Suspense fallback={<div style={{ padding: '20px', color: '#E9EDEF', textAlign: 'center' }}>Loading Screen...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exams" element={<ExamSelection />} />
          <Route path="/quiz/:chapterId" element={<QuizSession />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
