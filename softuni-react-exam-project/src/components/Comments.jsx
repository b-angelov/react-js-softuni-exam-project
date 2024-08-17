import {useContext, useEffect, useState} from "react";
import AuthContext from "../contexts/AuthContext.js";
import useRequest from "../hooks/useRequest.js";
import {useForm} from "../hooks/useForm.jsx";
import ArticlesContext from "../contexts/ArticlesContext.js";
import CommentItem from "./Items/CommentItem.jsx";

const formValues = {
    comment: ""
}

export default function Comments(props){

    let {title, article, image,_id,_ownerId:owner,userId:user} = props.data;
    const [comments,setComments] = useState([]);
    const {baseUrl,logError,authorisedHeader,data} = useContext(AuthContext);
    const url = `${baseUrl}/data/comments?where=${encodeURIComponent(`articleId="${_id}"`)}&load=${encodeURIComponent(`author=_ownerId:users`)}`
    const {request} = useRequest(url,{});
    const [reload, setReload] = useState(false)

    const toggleReload = () => { setReload(!reload)}

    // (async()=>{

    // })()

    useEffect(() => {
        (async () => {
            console.log(url)
            const response = await request.get(url)
            console.log(response)
            setComments(Object.values(response).map(val => <CommentItem {...val} reload={toggleReload}/>))
        })()
    }, [reload]);

    const commentFormHandler = (values) => {
        console.log(values)
        let response = request.create(`${baseUrl}/data/comments`, {headers:authorisedHeader,body:JSON.stringify({...values,articleId:_id})})
        if (response.status >= 400){
            logError("could not load comments")
        }else{
            setComments(Object.values(response).map(val=> <CommentItem {...val} reload={toggleReload}/>))

        }
        toggleReload()
    }

    const {values, submitHandler, changeHandler} = useForm(formValues, commentFormHandler)

    return (
        <>
        {comments ? (<><div>{"Comments:"}</div><div>{comments}</div></>) :(<div>No comments</div>)}
            {data.authenticated && <div>
                <form className={"comment-form"} onSubmit={submitHandler}>
                    <textarea placeholder={"Type something here:"} name="comment" onChange={changeHandler}></textarea>
                    <input type={"submit"} value={"Submit"}/>
                    {

                    }
                </form>
            </div>}
        </>
    )
}