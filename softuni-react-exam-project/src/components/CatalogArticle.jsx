import {Link} from "react-router-dom";
import {useContext, useState} from "react";
import DeleteModal from "./DeleteModal.jsx";
import AuthContext from "../contexts/AuthContext.js";
import useRequest from "../hooks/useRequest.js";
import ArticlesContext from "../contexts/ArticlesContext.js";

export default function CatalogArticle(props){
    let {title,article,image,_id,_ownerId:owner,userId:user} = props.data
    title = (<h1>{title}</h1>);
    article = article.slice(0,35) + "..."
    const [deleteModal, setDeleteModal] = useState(false);
    const {baseUrl, logError,authorisedHeader} = useContext(AuthContext);
    const {reload} = useContext(ArticlesContext)
    const {request} = useRequest(`${baseUrl}/data/articles/${_id}`,{headers:authorisedHeader})

    const onEditHandler = (e) => {
        e.preventDefault()

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
        <div style={{minHeight:"20vh",alignContent:"center", display:"flex", justifyContent:"center", alignItems:"center", justifyItems:"center"}}>
            <img src={image} style={{maxWidth: "30vw", maxHeight:"25vh", aspectRatio:"2/1", }} alt={"image"}></img>
            <div style={{columnSpan:3, padding: "1em 2em"}}>{title}
            {article}
                <div><Link to={`/articles/details/${_id}`}><button>details</button></Link></div>
            </div>
            {(user === owner) &&
            <div>
                <button onClick={onEditHandler}>Edit</button>
                <button onClick={onDeleteHandler}>Delete</button>
            </div>
            }
            {deleteModal && <DeleteModal data={{deleteArticle,setDeleteModal}} />}
        </div>
    );
}