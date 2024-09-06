import useRequest from "../hooks/useRequest.js";
import useAuth from "../hooks/useAuth.js";
import ItemComponent from "./Items/ItemComponent.jsx";
import {useContext, useEffect, useState} from "react";
import ArticleComponent from "./Items/ArticleComponent.jsx";
import Paragraph from "./Paragraph.jsx";
import CatalogArticle from "./CatalogArticle.jsx";
import {useParams} from "react-router-dom";
import CreateArticle from "./CreateArticle.jsx";
import AuthContext from "../contexts/AuthContext.js";
import ArticlesContext from "../contexts/ArticlesContext.js";
import EditArticle from "./EditArticle.jsx";
import {createPortal} from "react-dom";

export default function Articles() {

    const {id:currentId} = useParams()
    const url = `http://localhost:3030/data/articles${currentId ? '/' + currentId : ''}?load=${encodeURIComponent('author=_ownerId:users')}`
    const {request, setRequest} = useRequest(url, {})
    const {data} = useContext(AuthContext)
    const userId = data._id
    let [articles, setComponent] = useState([])
    const [createArticleModal, setArticleModal] = useState(false)
    const [reload, setReload] = useState(false)
    let requestCondition = false
    const [editArticleModal, setEditModal] = useState(false)
    const [editValues, setEditValues] = useState({})


    const toggleEdit = (e) =>{
        if(e) e.preventDefault()
        editArticleModal ? setEditModal(false) : setEditModal(true)
    }

    const handleEdit = (e, values) => {
        setEditValues(values)
        toggleEdit(e)
    }

    const toggleCreate = (e) =>{
        if(e) e.preventDefault()
        createArticleModal ? setArticleModal(false) : setArticleModal(true)
    }

    const reloadFn = () =>{
        setReload(!reload)
    }


    useEffect(() => {
        request.get(`http://localhost:3030/data/articles${currentId ? '/' + currentId : ''}?load=${encodeURIComponent('author=_ownerId:users')}`).then(response=> {
            if(url.includes(currentId)) response = {[currentId]:response}
            console.log(response,currentId)
            const comp = Object.values(response).map(({title,article,image,_id,_ownerId,author}) => {
                return currentId
                    ? <ArticleComponent key={_id} data={{title, article, image, _id,_ownerId,userId,author}}/>
                    : <CatalogArticle key={_id} data={{title, article, image, _id,_ownerId,userId,author}}/>;
            })
            setComponent(comp)
        })
        requestCondition = false
    }, [requestCondition,currentId,createArticleModal,reload]);

    return (
        <ArticlesContext.Provider value={{reload:reloadFn,toggleEdit,handleEdit}}>
            {articles}
            {!currentId && data.authenticated && <div style={{zIndex:1,opacity:1,cursor:"pointer",fontSize:"6em", padding:0, margin:0, textAlign:"center", color:"rgba(132,132,246,0.9)", fontWeight:221, textShadow:"0.01em 0.01em 0.01em rgb(99,112,62,0.9)"}} onClick={toggleCreate} >
                <figure style={{margin:0,padding:0, maxHeight:"1em"}}>+</figure>
                <p style={{fontSize:"0.2em", margin:0}}>Create New Article</p>
            </div>}
            {createArticleModal && createPortal(<CreateArticle props={{toggleCreate}}/>, document.body)}
            {editArticleModal && createPortal(<EditArticle {...editValues} />, document.body)}
        </ArticlesContext.Provider>
    );
}