import { useState } from 'react';
import './App.css';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ChatArea from './components/Chat/ChatArea';
import InputBar from './components/Input/InputBar';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [docLoaded, setDocLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleClearData = () => {
    setMessages([]);
    setDocLoaded(false);
    localStorage.clear();
  };

  return (
    <div className="app-container">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onClearData={handleClearData}
      />
      
      <div className="app-main">
        <Sidebar 
          isOpen={sidebarOpen}
          docLoaded={docLoaded}
          onDocumentLoad={setDocLoaded}
        />
        
        <ChatArea 
          messages={messages}
          isProcessing={isProcessing}
        />
      </div>
      
      <InputBar 
        docLoaded={docLoaded}
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default App;