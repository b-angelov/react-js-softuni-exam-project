import React, {createContext, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { createRoot } from 'react-dom/client';
// import './App.css'
import UserPosition from "./components/UserPosition/UserPosition.jsx";
import AbovePosition from "./components/AbovePosition/AbovePosition.jsx";
import MessagePosition from "./components/MessagePosition/MessagePosition.jsx";
import MainPosition from "./components/MainPosition/MainPosition.jsx";
import BelowMainPosition from "./components/BelowMainPosition/BelowMainPosition.jsx";
import {Link, useLocation} from "react-router-dom";
import AuthContext from "./contexts/AuthContext.js";
import useAuth from "./hooks/useAuth.js";

function App() {
    const [count, setCount] = useState(0)
    const location = useLocation()
    const {login, data,logout, register, logError,authorisedHeader,baseUrl} = useAuth()
    const error = data.error


    return (
        <AuthContext.Provider value={{login,data,logout,register,logError,authorisedHeader,baseUrl}}>
            <div id="container">
                <div id="container-top-border">

                </div>

                <div id="website" className={data.authenticated ? "single" : "sided"}>
                    <div id="header-main-wrapper">
                        <div id="header">
                            <Link to="/">
                                <div id="logo">

                                </div>

                            </Link>

                        </div>


                        <div id="user3">
                            <table cellPadding="00" cellSpacing="00" className="pill" align="center"
                                   style={{Padding:'0px', Margin:'auto',  TextAlign:'center', BorderCollapse:'collapse',  BorderSpacing:0, BorderStyle:'none', BorderWidth:'0px'}}>
                                <tr>
                                    <td className="pwdth">

                                    </td>

                                    <td className="pill_up_border">

                                    </td>

                                    <td className="pwdth">

                                    </td>

                                </tr>

                                <tr>
                                    <td className="pill_l">
                                        &nbsp;
                                    </td>

                                    <td className="pill_m">
                                        <div className="" id="use3">
                                            <UserPosition/>
                                        </div>

                                    </td>

                                    <td className="pill_r">
                                        &nbsp;
                                    </td>

                                </tr>

                            </table>

                        </div>

                    </div>

                    <div id="content" className={data.authenticated ? "single" : "sided"}>
                        <div id="style-around">
                            <div id="style-around-column">
                                <div className="images-container-backgrounder">
                                    <div className="images-container-backgrounder-row">
                                        <div className="top-item-backgrounder">

                                        </div>

                                    </div>

                                    <div className="images-container-backgrounder-row">
                                        <div className="main-item-backgrounder main-item-backgrounder-left">

                                        </div>

                                    </div>

                                    <div className="images-container-backgrounder-row">
                                        <div className="bottom-item-backgrounder">

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div id="right-style">
                                <div className="images-container-backgrounder">
                                    <div className="images-container-backgrounder-row">
                                        <div className="top-item-backgrounder">

                                        </div>

                                    </div>

                                    <div className="images-container-backgrounder-row">
                                        <div className="main-item-backgrounder main-item-backgrounder-right">

                                        </div>

                                    </div>

                                    <div className="images-container-backgrounder-row">
                                        <div className="bottom-item-backgrounder">

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div id="left">

                            </div>

                            <div id="component_right">
                                <div className="" id="above-component">
                                    <AbovePosition props={data} />
                                </div>

                                <div className={"no-component-background " + (!error && "disable-preview")}>
                                    <div className={"message-container  " + (!error && "disable-preview")}>
                                        <MessagePosition message={error} />
                                    </div>

                                    <div className="component-wrapper">
                                        <MainPosition/>
                                    </div>

                                </div>

                                <div className="" id="below-component">
                                    <BelowMainPosition/>
                                </div>

                            </div>


                        </div>

                        <div id="footer">
		 		 		 		 		 		  		  <span style={{Color: '#ffffff', FontFamily: 'Arial'}}>
		 		 		 		 		 		 		  		 b.angelov's Exam Project - August 2024 &copy;
                                                              <br/>

		 		 		 		 		 		 		 		 Всички права запазени
		 		 		 		 		 		 		 </span>

                        </div>

                    </div>

                </div>

                <div id="bottom">

                </div>

            </div>
        </AuthContext.Provider>
  )
}

export default App
