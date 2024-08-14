export default function ArticleComponent(props){
    const {title, article, image} = props.data;
    return (
        <>
            <div>
                <ul>
                    <img src={image} alt='avatar image'
                         style={{maxWidth: '300px', maxHeight: "300px", aspectRatio: "7/1"}}/>
                    <li style={{minWidth:"100%", margin:0, padding:0}}>{title}</li>
                    <li style={{minWidth:"100%", margin:0, padding:0}}>{article}</li>
                </ul>
            </div>
        </>
    )
}