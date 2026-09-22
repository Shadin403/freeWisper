import React, { useState, useEffect } from 'react';
import FloatingWidget from './components/FloatingWidget';
import SettingsDashboard from './components/SettingsDashboard';

export default function App() {
  const [view, setView] = useState('widget');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, '?'));
    const viewParam = searchParams.get('view') || hashParams.get('view');

    if (viewParam === 'settings') {
      setView('settings');
      document.body.style.background = '#0B0C13';
    } else {
      setView('widget');
      document.body.style.background = 'transparent';
    }
  }, []);

  return (
    <div className="w-full h-full">
      {view === 'settings' ? <SettingsDashboard /> : <FloatingWidget />}
    </div>
  );
}
