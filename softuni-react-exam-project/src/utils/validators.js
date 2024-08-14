function validateUsername(value){
    console.log(value)
    const re = /[a-zA-Z0-9]{6,20}$/gi
    if (value.search(re) === -1){
        throw new Error("Invalid username!")
    }
}

function validateEmail(value){
    console.log(value);
    const re = /^[a-z\-]+@[a-z\-]+\..{0,5}$/g;
    if (value.search(re) === -1){
        throw new Error("Invalid email!")
    }
}

function validatePassword(password,confirm){
    if (password !== confirm){
        throw new Error("Password mismatch!")
    }
    const re = /^(?=.*[0-9]+)(?=.*[a-z]+)(?=.*[A-Z]+)[a-zA-Z0-9]{6,20}$/gm
    if (password.search(re) === -1){
        throw new Error("Password contains inappropriate symbols or is empty!\n Password should be between 6 and 20 symbols and contain at least one lowercase letter, one uppercase letter and one digit.")
    }

}

export {validateUsername, validateEmail, validatePassword}