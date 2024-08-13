export default function AbovePosition(props) {
    const {authenticated,username} = props.props
    return (
        <>
            <div style={{textAlign: "center", }}>Welcome {authenticated ? username : "Unauthenticated!"}</div>
        </>
    )
}