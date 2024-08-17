
async function request(url="", data={}, method=null){

    if(method === null && data){
        method = 'POST'
    }
    data = {method, ...data}
    let response;

    try{
        response = await fetch(url,data)
        response = await response.json()
    }catch(err){
        console.log(err.message)
        return
    }

    return response
}

async function gets(url, data){
    return await request(url, data, 'GET')
}

async function deletes(url, data){
    return await request(url, data, 'DELETE').status
}

async function creates(url, data, method='POST'){
    console.log('something was created')
    console.log(data)
    data = {
        headers:{
            'Content-Type':'application/json',
            'X-Authorization':""
        },
        body: JSON.stringify(data.body),
        ...data
    }
    console.log(data,"here")
    return await request(url, data, method)
}

async function updates(url, data){
    return await creates(url, data, 'PATCH')
}

export {
    gets,
    deletes,
    creates,
    updates
}