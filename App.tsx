import React from 'react';
import { NeonDash } from './components/NeonDash';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white">
      <NeonDash />
    </div>
  );
};

export default App;