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

export default function Articles() {

    const {id:currentId} = useParams()
    console.log(currentId)
    const url = `http://localhost:3030/data/articles${currentId ? '/' + currentId : ''}`
    const {request, setRequest} = useRequest(url, {})
    const {data} = useContext(AuthContext)
    let [articles, setComponent] = useState([])
    const [createArticleModal, setArticleModal] = useState(false)
    let requestCondition = false

    const toggleCreate = (e) =>{
        if(e) e.preventDefault()
        createArticleModal ? setArticleModal(false) : setArticleModal(true)
    }


    useEffect(() => {
        request.get(`http://localhost:3030/data/articles${currentId ? '/' + currentId : ''}`).then(response=> {
            if(url.includes(currentId)) response = {[currentId]:response}
            console.log(response)
            const comp = Object.values(response).map(({title,article,image,_id}) => {
                return currentId
                    ? <ArticleComponent key={_id} data={{title, article, image, _id}}/>
                    : <CatalogArticle key={_id} data={{title, article, image, _id}}/>;
            })
            setComponent(comp)
        })
        requestCondition = false
    }, [requestCondition,currentId,createArticleModal]);

    return (
        <>
            {articles}
            {!currentId && data.authenticated && <div style={{cursor:"pointer",fontSize:"6em", padding:0, margin:0, textAlign:"center", color:"rgba(132,132,246,0.9)", fontWeight:221, textShadow:"0.01em 0.01em 0.01em rgb(99,112,62,0.9)"}} onClick={toggleCreate} >
                <figure style={{margin:0,padding:0, maxHeight:"1em"}}>+</figure>
                <p style={{fontSize:"0.2em", margin:0}}>Create New Article</p>
            </div>}
            {createArticleModal && <CreateArticle props={{toggleCreate}}/>}
        </>
    );
}