import React from 'react';
import { Route, Navigate } from "react-router-dom";
import Welcome from "../components/Welcome.jsx";

const GuardedRoute = ({ component: Component, auth, ...rest }) => (
    <Route {...rest} render={(props) => (
        auth === true
            ? <Component {...props} />
            : <Navigate to='/' />
    )} />
)

export default GuardedRoute;