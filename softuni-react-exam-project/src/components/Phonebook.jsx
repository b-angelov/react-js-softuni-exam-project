import useRequest from "../hooks/useRequest.js";
import {useEffect, useState} from "react";
import ItemComponent from "./Items/ItemComponent.jsx";
import {useLocation} from "react-router-dom";


export default function Phonebook(){

    import('../assets/css/styles/marble/single.css')
    const url = 'http://localhost:3030/jsonstore/phonebook'
    const {request, setRequest} = useRequest(url, {})
    let [component, setComponent] = useState([])
    let requestCondition = false

    useEffect(() => {
        request.get().then(response=> {
            const comp = Object.values(response).map(({person, phone, avatar, _id}) => <ItemComponent key={_id} data={{person, phone, avatar}}/>)
            setComponent(comp)
        })
        requestCondition = false
    }, [requestCondition]);

    return (
        <>
            {component}
        </>
    )
}