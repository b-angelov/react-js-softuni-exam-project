import {Link} from "react-router-dom";

export default function Welcome(){
    return (
        <>
            <div>
                <header>
                    <h1>Welcome</h1>
                    <section>
                        Welcome to our site. Here you can find whatever you want, in case we have added it.
                        If you don't find what you want, you may head to contact section and let us know for the next time you visit us.
                        If you don't find it next time, you may try again, although the result will probably be the same.
                    </section>
                    <section>
                        <h2>Login Prompt</h2>
                        <article>
                            If you are indeed curious about the reason this site exists, please use our register section.
                            If you have already registered but are still curious about the website's purpose, you may try login instead.
                            <nav style={{display:"flex",alignContent:"center", justifyContent:"center", gap:"2em"}}>
                                <Link to="login">
                                    <button type="submit" className={"button"}>login</button>
                                </Link>
                                <Link to="register">
                                    <button type="submit" className={"button"}>register</button>
                                </Link>
                            </nav>
                        </article>
                    </section>
                </header>
            </div>
        </>
    )
}