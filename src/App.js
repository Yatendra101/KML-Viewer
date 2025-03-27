import React from "react";
import KMLViewer from "./components/KMLViewer";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 KML File Viewer</h1>
        <p>Upload and visualize your KML files on an interactive map.</p>
      </header>

      <main className="content-container">
        <KMLViewer />
      </main>

      <footer className="App-footer">
        <p>© {new Date().getFullYear()} KML Viewer | Built with React & Leaflet.js</p>
      </footer>
    </div>
  );
}

export default App;
