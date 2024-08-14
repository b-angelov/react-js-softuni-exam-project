import useRequest from "../hooks/useRequest.js";
import useAuth from "../hooks/useAuth.js";
import ItemComponent from "./Items/ItemComponent.jsx";
import {useEffect, useState} from "react";
import ArticleComponent from "./Items/ArticleComponent.jsx";

export default function Articles() {

    const {request, setRequest} = useRequest('http://localhost:3030/data/articles', {})
    let [articles, setComponent] = useState([])
    let requestCondition = false

    useEffect(() => {
        request.get().then(response=> {
            const comp = Object.values(response).map(({title,article,image,_id}) => <ArticleComponent key={_id} data={{title,article,image}}/>)
            setComponent(comp)
        })
        requestCondition = false
    }, [requestCondition]);

    return (
        <>
            {articles}
        </>
    );
}