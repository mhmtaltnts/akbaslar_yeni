import { useState, useEffect } from "react"
import { useAddNewUserMutation } from "../../app/api/usersApiSlice"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from "@fortawesome/free-solid-svg-icons"
import { ROLES } from "../../config/roles"
import useTitle from "../../hooks/useTitle"

/* const USER_REGEX = /^[A-z0-9]{3,20}$/
const PWD_REGEX = /^[A-z0-9!@#$%]{4,12}$/ */

const NewUser = () => {
    useTitle('Yeni Kullanıcı')

    const [addNewUser, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useAddNewUserMutation()

    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    //const [validUsername, setValidUsername] = useState(false)
    const [password, setPassword] = useState('')
    //const [validPassword, setValidPassword] = useState(false)
    const [roles, setRoles] = useState(["Çalışan"])

    /* useEffect(() => {
        setValidUsername(USER_REGEX.test(username))
    }, [username])

    useEffect(() => {
        setValidPassword(PWD_REGEX.test(password))
    }, [password]) */

    useEffect(() => {
        if (isSuccess) {
            setFullName('')
            setUsername('')
            setPassword('')
            setRoles([])
            navigate('/dash/users')
        }
    }, [isSuccess, navigate])
    
    const onFullNameChanged = e => setFullName(e.target.value)
    const onUsernameChanged = e => setUsername(e.target.value)
    const onPasswordChanged = e => setPassword(e.target.value)

    const onRolesChanged = e => {
        const values = Array.from(
            e.target.selectedOptions, //HTMLCollection 
            (option) => option.value
        )
        setRoles(values)
    }

    const canSave = !isLoading

    const onSaveUserClicked = async (e) => {
        e.preventDefault()
        if (canSave) {
            await addNewUser({ fullName, username, password, roles })
        }
    }

    const options = Object.values(ROLES).map(role => {
        return (
            <option
                key={role}
                value={role}

            > {role}</option >
        )
    })

    const errClass = isError ? "errmsg" : "offscreen"
    /* const validUserClass = !validUsername ? 'form__input--incomplete' : ''
    const validPwdClass = !validPassword ? 'form__input--incomplete' : '' */
    const validRolesClass = !Boolean(roles.length) ? 'form__input--incomplete' : ''


    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            <p className={errClass}>{error?.data?.message}</p>
            <form className="form" onSubmit={onSaveUserClicked} autoComplete="off">
                <div className="form__title-row">
                    <h2>Yeni Kullanıcı</h2>
                    <div className="form__action-buttons-wrapper">
                        <div className="form__action-buttons">
                            <button
                                className="form__button success__button"
                                title="Kaydet"
                                disabled={!canSave}
                            >
                                <FontAwesomeIcon icon={faSave} />
                            </button>
                        </div>                        
                    </div> 
               
                </div>
                <input
                    className="form__input"
                    id="fullname"
                    name="fullname"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    placeholder="Adı ve Soyadı"
                    onChange={onFullNameChanged}
                    autoFocus
                />
                <input
                    className="form__input"
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="off"
                    value={username}
                    placeholder="Kullanıcı Adı"
                    onChange={onUsernameChanged}
                />

                <input
                    className="form__input"
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="off"
                    value={password}
                    placeholder="Şifre"
                    onChange={onPasswordChanged}
                />
    
            <div className="form-group">
                <label className="form__label" htmlFor="roles">
                    Rolleri:</label>
                <select
                    id="roles"
                    name="roles"
                    className={`form__select ${validRolesClass}`}
                    multiple={true}
                    size="4"
                    value={roles}
                    onChange={onRolesChanged}
                >
                    {options}
                </select>
            </div>
            </form>
        </div>
        </div>
    )

    return content
}
export default NewUser