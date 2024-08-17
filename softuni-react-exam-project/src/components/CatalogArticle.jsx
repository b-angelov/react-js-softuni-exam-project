import {Link} from "react-router-dom";

export default function CatalogArticle(props){
    let {title,article,image,_id} = props.data
    title = (<h1>{title}</h1>);
    article = article.slice(0,35) + "..."
    return (
        <div style={{minHeight:"20vh",alignContent:"center", display:"flex", justifyContent:"center", alignItems:"center", justifyItems:"center"}}>
            <img src={image} style={{maxWidth: "30vw", maxHeight:"25vh", aspectRatio:"2/1", }} alt={"image"}></img>
            <div style={{columnSpan:3, padding: "1em 2em"}}>{title}
            {article}
                <div><Link to={`/articles/details/${_id}`}><button>details</button></Link></div>
            </div>
        </div>
    );
}