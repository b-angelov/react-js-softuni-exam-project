import {Routes, Route, Link, NavLink} from "react-router-dom";
import {useContext} from "react";
import AuthContext from "../../contexts/AuthContext.js";
import Logout from "../Logout.jsx";

export default function UserPosition() {
    const {data} = useContext(AuthContext)
    return (
        <>
            <nav className={"menu nav-tabs nav nav-list nav-pills nav-bar"}>
                <ul className={"menu nav-tabs nav nav-list nav-pills nav-bar"}>
                    <li>
                        <NavLink to="/">Home</NavLink>
                    </li>

                    {!data.authenticated  && <><li>
                        <NavLink to="login">Login</NavLink>
                    </li>
                        <li>
                        <NavLink to="register">Register</NavLink>
                        </li></>}
                    <li>
                        <NavLink to="phonebook">Phonebook</NavLink>
                    </li>
                    <li>
                        <NavLink to="articles">Articles</NavLink>
                    </li>
                    {data.authenticated && <>
                        <li>
                            <NavLink to="logout">Logout</NavLink>
                        </li>
                    </>}

                </ul>
            </nav>
        </>
    )
}