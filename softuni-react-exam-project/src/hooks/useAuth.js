import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {validateEmail, validatePassword, validateUsername} from "../utils/validators.js";

const initialState =  {
    email:"",
    username:"",
    _id:"",
    accessToken:"",
    authenticated: false,
    error:""
}

export default function useAuth(){

    const baseUrl = "http://localhost:3030"
    const authUrl = `${baseUrl}/users/login`
    const regUrl = `${baseUrl}/users/register`
    const logoutUrl = `${baseUrl}/users/logout`
    const navigate = useNavigate()

    const [loginState, setLogin]= useState(initialState)

    const authorisedHeader = {
        "Content-Type":"application/json",
        "X-Authorization":loginState.accessToken
    }


    const login = async(email,password)=>{
        let request;
        try {
            request = await fetch(authUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            })
            const status = request.status
            request = await request.json()
            setLogin(()=> (
                {
                    ...loginState,
                    ...request,
                    error:"",
                    authenticated: !!request._id
                }
            ))
            if (status >= 400){
                logError("Login failed!")
            }
            return status
        }
        catch(err){
            console.log(err.message)
            logError("Login failed!")
            return false
        }

        return request.code

    }

    const logout = (path='/') =>{
        setLogin(() => initialState);
        (async()=>{
            await fetch(logoutUrl, {
                method: "GET",
                headers:authorisedHeader,
            })
        })();
        navigate(path);
        logError("You have successfully logged out!",initialState);
    }

    const logError = (error,state=loginState) => {

        setLogin(() => (
            {
                ...state,
                    error,
            }))

        setTimeout(()=>{
            setLogin(() => (
                {
                    ...state,
                    error:false,
                }))
        },3000)
    }

    const register = async (username,password,email,confirm) => {
        try{
            validateUsername(username)
            validateEmail(email)
            validatePassword(password,confirm)
        }catch(err){
           logError(err.message)
        }

        let request;
        try{
            request = await fetch(regUrl,{
                method: "POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email,
                    password,
                    username
                })
            })
            const status = request.status
            request = await request.json()
            if (status >= 400){
                logError("Registration failed!")
            }else{
                await login(email,password)
                navigate("/")
            }

        }catch(err){
            console.log(err.message)
            logError("Registration failed!")
            return false
        }
    }


    return {login,data:loginState, logout, register, authorisedHeader, baseUrl, logError}

}