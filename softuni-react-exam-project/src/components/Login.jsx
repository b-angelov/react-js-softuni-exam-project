import {useForm} from "../hooks/useForm.jsx";
import {Link, useNavigate} from "react-router-dom";
import AuthContext from "../contexts/AuthContext.js";
import {useContext} from "react";

const formValues = {
    email:"",
    password:""
}

export default function Login(){

    const {login, data} = useContext(AuthContext)
    const navigate = useNavigate()

    const loginSubmitHandler = ({email, password}) =>{
        (async ()=> {
            const logged = await login(email, password)
            if (logged === 200){
                navigate("/")
            }else{
                console.log("Login failed")
            }

        })()
    }

    const {values, changeHandler, submitHandler} = useForm(formValues, loginSubmitHandler)

    return (
        <>
            <div className={"login login-container"} style={{minHeight: "90vh", height: "100%"}}>
                <form onSubmit={submitHandler}>
                    <ul>
                        <li>
                            <label htmlFor="email">Email:</label>
                            <input type="text" name="email" placeholder="email" onChange={changeHandler} name="email"/>
                        </li>

                        <li>
                            <label htmlFor="password">Password:</label>
                            <input type="password" className="password" placeholder="password" name="password"
                                   onChange={changeHandler}/>
                        </li>
                        <li>
                            <input type="submit" value="submit" onSubmit={submitHandler}/>
                        </li>
                    </ul>
                </form>
                <div className={"login-container register-prompt"}>
                    Don't have registration?
                    <p><Link to={'/register'}>Register</Link></p>
                </div>
            </div>

        </>
    )

}