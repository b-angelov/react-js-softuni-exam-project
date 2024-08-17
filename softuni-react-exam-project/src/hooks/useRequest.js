import {useContext, useEffect, useState} from "react";
import {creates, updates, deletes, gets} from "../APIs/requestAPI.js";
import AuthContext from "../contexts/AuthContext.js";

function useRequest(url="", data={}) {

    const {AuthorisedHeader:header} = useContext(AuthContext)
    data = {
        headers:header,
        ...data
    }
    const update = async (urli,datai) => await updates(urli || url, datai || data);
    const get = async (urli,datai) => await gets(urli || url, datai || data);
    const create = async (urli,datai) => await creates(urli || url, datai || data);
    const deletes = async (urli,datai) => await deletes(urli || url, datai || data);

    const [request, setRequest] = useState({
        update,
        get,
        create,
        delete:deletes
    })


    return {request, setRequest}

}

export default useRequest