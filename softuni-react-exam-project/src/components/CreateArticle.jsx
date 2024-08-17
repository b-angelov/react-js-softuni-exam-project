import useRequest from "../hooks/useRequest.js";
import {useContext, useState} from "react";
import {useForm} from "../hooks/useForm.jsx";
import AuthContext from "../contexts/AuthContext.js";
import {useNavigate} from "react-router-dom";

const formValues = {
    title:"",
    article:"",
    image:""
}

export default function CreateArticle(props){

    const {request} = useRequest()
    const {logError,data,baseUrl,authorisedHeader} = useContext(AuthContext)
    const [image, setImage] = useState("https://boeq.com.au/wp-content/uploads/2018/06/generic-headshot.png")
    const {toggleCreate} = props.props
    const navigate = useNavigate()



    const articleCreateHandler = (values) => {
        if (Object.values(values).includes("")){
            logError("All fields are required!")
            return
        }
        (async () =>{
            const response = await request.create(`${baseUrl}/data/articles`,{headers:authorisedHeader,body:JSON.stringify(values)})
            if (response.status >= 400){
                logError("Could not create article!")
            }else {
                toggleCreate()
                navigate("/articles")
            }
        })()
    }

    const imageChangeHandler = (e)=>{
        setImage(() => e.target.value)
        changeHandler(e)
    }

    const {values, changeHandler, submitHandler} = useForm(formValues, articleCreateHandler)



    return (
        <>
            <div className={"create-article"}>
                {data.error && <div className="message-container">{data.error}</div>}
                <img src={image} alt={"article image"} className={"create-article-image"}/>
                <form className={"login-container article-form "} onSubmit={submitHandler}>
                    <ul>
                        <li>
                            <label htmlFor="title">Title:</label>
                            <input type="text" name="title" placeholder="title" onChange={changeHandler}/>
                        </li>

                        <li>
                            <label htmlFor="article">Article content:</label>
                            <textarea name="article" onChange={changeHandler}></textarea>
                        </li>
                        <li>
                            <label htmlFor="image">Image:</label>
                            <input type="text" name="image" placeholder="image" onChange={imageChangeHandler}/>
                        </li>
                        <li>
                            <input type="submit" value="Create" onSubmit={submitHandler}/>
                            <input type="submit" value="Cancel" onClick={toggleCreate}/>
                        </li>
                    </ul>
                </form>
            </div>
        </>
    )
}