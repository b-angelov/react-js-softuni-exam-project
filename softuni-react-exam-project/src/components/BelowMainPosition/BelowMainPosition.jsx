import useRequest from "../../hooks/useRequest.js";
import ItemComponent from "../Items/ItemComponent.jsx";
import {useContext, useEffect, useState} from "react";
import {Routes, Route, useLocation} from "react-router-dom";
import Welcome from "../Welcome.jsx";
import Phonebook from "../Phonebook.jsx";
import Login from "../Login.jsx";
import Register from "../Register.jsx";
import GuardedRoute from "../../routes/GuarderRoute.jsx";
import AuthContext from "../../contexts/AuthContext.js";
import Logout from "../Logout.jsx";
import Articles from "../Articles.jsx";

export default function BelowMainPosition() {

    const {data} = useContext(AuthContext)

    return (
        <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/phonebook" element={<Phonebook />} />
            <Route path="/login" element={!data.authenticated ? <Login /> : <Welcome />} />
            <Route path="/register" element={!data.authenticated ? <Register /> : <Welcome />} />
            <Route path="/logout" element={data.authenticated ? <Logout /> : <Welcome />} />
        </Routes>
    )
}