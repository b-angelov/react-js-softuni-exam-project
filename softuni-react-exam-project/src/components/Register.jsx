import {useForm} from "../hooks/useForm.jsx";
import {validateEmail, validatePassword, validateUsername} from "../utils/validators.js";
import {useContext} from "react";
import AuthContext from "../contexts/AuthContext.js";

const formValues = {
    username:"",
    email:"",
    password:"",
    confirm:"",
}

export default function Register(){

    const {register} = useContext(AuthContext)

    const registerSubmitHandler = ({username,password,email,confirm}) => {
        register(username,password,email,confirm)
    }

    const {values, changeHandler, submitHandler} = useForm(formValues, registerSubmitHandler)


    return (
        <>
            <div className={"login-container login"} style={{minHeight: "90vh", height: "100%"}}>
                <form onSubmit={submitHandler}>
                    <ul>
                        <li>
                            <label htmlFor="username">Username:</label>
                            <input type="text" name="username" placeholder="username" onChange={changeHandler}
                                   />
                        </li>
                        <li>
                            <label htmlFor="email">Email:</label>
                            <input type="text" name="email" placeholder="email" onChange={changeHandler} />
                        </li>
                        <li>
                            <label htmlFor="password">Password:</label>
                            <input type="password" className="password" placeholder="password" name="password"
                                   onChange={changeHandler}/>
                        </li>
                        <li>
                            <label htmlFor="confirm">Confirm password:</label>
                            <input type="password" className="password" placeholder="confirm" name="confirm"
                                   onChange={changeHandler}/>
                        </li>
                        <li>
                            <input type="submit" value="submit" onSubmit={submitHandler}/>
                        </li>
                    </ul>
                </form>

            </div>
        </>
    )

}