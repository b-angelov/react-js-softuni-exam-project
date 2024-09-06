import {Link} from "react-router-dom";
import {useContext, useState} from "react";
import DeleteModal from "./DeleteModal.jsx";
import AuthContext from "../contexts/AuthContext.js";
import useRequest from "../hooks/useRequest.js";
import ArticlesContext from "../contexts/ArticlesContext.js";
import EditArticle from "./EditArticle.jsx";
import {createPortal} from "react-dom";

export default function CatalogArticle(props){
    let {title,article,image,_id,_ownerId:owner,userId:user,author} = props.data
    title = (<h1>{title}</h1>);
    article = article.slice(0,35) + "..."
    const [deleteModal, setDeleteModal] = useState(false);
    const {baseUrl, logError,authorisedHeader} = useContext(AuthContext);
    const {reload, toggleEdit, handleEdit} = useContext(ArticlesContext)
    const url = `${baseUrl}/data/articles/${_id}`
    const {request} = useRequest(url,{headers:authorisedHeader})


    const onEditHandler = (e) => {
        e.preventDefault()
        handleEdit(e, {url,reload,...props.data})
    }



    const onDeleteHandler = (e) => {
        e.preventDefault()
        console.log("deletes",deleteModal)
        deleteModal ? setDeleteModal(false) : setDeleteModal(true)
    }

    const deleteArticle = () => {
        (async()=>{
            const response = await request.delete()
            if (response >= 400){
                logError("Could not delete article")
            }
            setDeleteModal(false)
            reload()
        })()
    }

    return (
        <div className={"catalog-article-itm"} style={{}}>
            <img src={image} className={"catalog-article-image"} style={{ }} alt={"image"}></img>
            <div  className={"catalog-article-title"}>{title}
            {article}
                <p className={'created-by'}>Created By: {author.username}</p>
                <div><Link to={`/articles/details/${_id}`}><button>details</button></Link></div>
            </div>
            {(user === owner) &&
            <div>
                <button onClick={onEditHandler}>Edit</button>
                <button onClick={onDeleteHandler}>Delete</button>
            </div>
            }
            {deleteModal && createPortal(<DeleteModal data={{deleteArticle,setDeleteModal}} />,document.body)}
        </div>
    );
}