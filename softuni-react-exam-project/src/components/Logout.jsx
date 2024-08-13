import useAuth from "../hooks/useAuth.js";
import {Navigate} from "react-router-dom";
import {useContext, useEffect} from "react";
import AuthContext from "../contexts/AuthContext.js";

export default function Logout(){
    const {logout} = useContext(AuthContext)

    useEffect(()=>{
       logout()
    },[])


    return (
        <>
        </>
    )
}