
export default function ItemComponent(props){
    const {person, phone, avatar} = props.data;
    return(
        <>
            <div>
                <ul>
                    <li>{person}</li>
                    <li>{phone}</li>
                    <img src={avatar} alt='avatar image' style={{maxWidth: '200px', maxHeight:"200px", aspectRatio:"5:1"}} />
                </ul>
            </div>
        </>
    );
}