import {useState} from "react";
import {useNavigate} from "react-router-dom";

const initialState =  {
    email:"",
    username:"",
    _id:"",
    accessToken:"",
    authenticated: false,
}

export default function useAuth(){

    const authUrl = "http://localhost:3030/users/login"
    const navigate = useNavigate()

    const [loginState, setLogin]= useState(initialState)


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
                    authenticated: !!request._id
                }
            ))
            return status
        }
        catch(err){
            console.log(err.message)
            return false
        }
        return request.code

    }

    const logout = (path='/') =>{
        setLogin(() => initialState)
        navigate(path)
    }


    return {login,data:loginState, logout}

}