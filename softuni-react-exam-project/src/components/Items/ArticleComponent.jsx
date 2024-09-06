import Paragraph from "../Paragraph.jsx";
import {Link} from "react-router-dom";
import Comments from "../Comments.jsx";

export default function ArticleComponent(props){
    let {title, article, image,_id,_ownerId:owner,userId:user,author} = props.data;
    article = article.split("\n").map(val=><Paragraph content={val} />)
    console.log(article)
    return (
        <>
            <div>
                <ul>
                    <img src={image} alt='avatar image'
                         style={{maxWidth: '300px', maxHeight: "300px", aspectRatio: "7/1"}}/>
                    <li style={{minWidth: "100%", margin: 0, padding: 0}}>{title}
                    </li>
                    <li style={{minWidth: "100%", margin: 0, padding: 0}}>{article}</li>
                </ul>
                <p className={'created-by right-pos'}>By: {author.username}</p>

                <Link to="/articles">
                    <button>&lt;&lt; Back</button>
                </Link>
                <div>
                    <Comments data={props.data}/>
                </div>
            </div>

        </>
    )
}