import {useContext, useEffect, useState} from "react";
import {creates, updates, deletes, gets} from "../APIs/requestAPI.js";
import AuthContext from "../contexts/AuthContext.js";

function useRequest(url, data) {

    const {AuthorisedHeader:header} = useContext(AuthContext)
    data = {
        header,
        ...data
    }

    const [request, setRequest] = useState({
        update: async () => await updates(url, data),
        get: async () => await gets(url, data),
        create: async () => await creates(url, data),
        delete: async () => await deletes(url, data),
    })


    return {request, setRequest}

}

export default useRequest