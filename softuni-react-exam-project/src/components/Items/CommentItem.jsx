import {useContext} from "react";
import AuthContext from "../../contexts/AuthContext.js";
import useAuth from "../../hooks/useAuth.js";
import ArticlesContext from "../../contexts/ArticlesContext.js";
import useRequest from "../../hooks/useRequest.js";

export default function CommentItem(props){

    const {data, baseUrl, authorisedHeader} = useContext(AuthContext)
    const {request} = useRequest("",{})
    // const {reload} = useContext(ArticlesContext)
    const userId = data._id


    const deleteHandler = async () => {
        const url = `${baseUrl}/data/comments/${props._id}`
        await request.delete(url,{headers:{...authorisedHeader}})
        props.reload()
    }

    return (
        <>
            <div className={"message-container green"}>{props.author.username} said: {props.comment}</div>
            {
                props._ownerId === userId &&
            <div>
                <button onClick={deleteHandler}>delete</button>
            </div>}
        </>
    )
}