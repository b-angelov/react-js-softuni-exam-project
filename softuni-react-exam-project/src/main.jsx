import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'
import './assets/css/styles/marble/template-marble.css'
import './assets/css/styles/marble/single.css'
import './assets/css/styles/marble/sided.css'
import './assets/css/testing.css'
import './assets/css/styles/marble/sided.css'
import './assets/css/bootstrap.classes.css'
import './assets/css/53dd9e63cfbfbc42cd5a19db5136ac3e.css'
import {BrowserRouter, useLocation} from "react-router-dom";

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
