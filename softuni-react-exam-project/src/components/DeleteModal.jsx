export default function DeleteModal(props){
    const {setDeleteModal,deleteArticle} = props.data
    return (
        <>
            <div className={"delete-modal"}>
                <h1>Do you really want to delete this article?</h1>
                <button onClick={deleteArticle}>Yes</button>
                <button onClick={() => setDeleteModal(false)}>No</button>
            </div>
        </>
    )
}