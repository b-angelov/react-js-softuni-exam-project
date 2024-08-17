import useRequest from "../hooks/useRequest.js";
import {useContext, useEffect, useState} from "react";
import {useForm} from "../hooks/useForm.jsx";
import AuthContext from "../contexts/AuthContext.js";
import {useNavigate} from "react-router-dom";
import ArticlesContext from "../contexts/ArticlesContext.js";

const formValues = {
    title:"",
    article:"",
    image:""
}

export default function EditArticle(props){

    const {request} = useRequest()
    const {logError,data,baseUrl,authorisedHeader} = useContext(AuthContext)
    // const [image, setImage] = useState("https://boeq.com.au/wp-content/uploads/2018/06/generic-headshot.png")
    const {toggleEdit, handleEdit, reload} = useContext(ArticlesContext)
    const navigate = useNavigate()
    const {title,article,image,_id,_ownerId:owner,userId:user} = props;
    const [stateImage, setImage] = useState(image);

    useEffect(() => {

    }, []);



    const articleEditHandler = (values) => {
        values = {
            title: values.title || title,
            article: values.article || article,
            image: values.image || image,
        }
        // console.log(values)
        if (Object.values(values).includes("")){
            logError("All fields are required!")
            return
        }
        (async () =>{
            const response = await request.update(`${baseUrl}/data/articles/${_id}`,{headers: {...authorisedHeader,"Access-Control-Allow-Origin": "http://localhost:5173/*","Vary":"Origin"},body:JSON.stringify(values)})
            if (response.status >= 400){
                logError("Could not create article!")
            }else {
                toggleEdit()
                navigate("/articles")
                reload()
            }
        })()
    }

    const imageChangeHandler = (e)=>{
        setImage(() => e.target.value)
        changeHandler(e)
    }

    const {values, changeHandler, submitHandler} = useForm(formValues, articleEditHandler)




    return (
        <>
            <div className={"create-article"} style={{}}>
                {data.error && <div className="message-container">{data.error}</div>}
                <img src={stateImage} alt={"article image"} className={"create-article-image"}/>
                <form className={"login-container article-form "} onSubmit={submitHandler}>
                    <ul>
                        <li>
                            <label htmlFor="title">Title:</label>
                            <input type="text" defaultValue={title} name="title" placeholder="title" onChange={changeHandler}/>
                        </li>

                        <li>
                            <label htmlFor="article">Article content:</label>
                            <textarea name="article" onChange={changeHandler} defaultValue={article}></textarea>
                        </li>
                        <li>
                            <label htmlFor="image">Image:</label>
                            <input type="text" defaultValue={image} name="image" placeholder="image" onChange={imageChangeHandler}/>
                        </li>
                        <li>
                            <input type="submit" value="Edit" onSubmit={submitHandler}/>
                            <input type="submit" value="Cancel" onClick={toggleEdit}/>
                        </li>
                    </ul>
                </form>
            </div>
        </>
    )
}