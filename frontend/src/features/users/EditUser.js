import { useParams } from 'react-router-dom'
import { useGetUsersQuery } from '../../app/api/usersApiSlice'
import PulseLoader from 'react-spinners/PulseLoader'
import useTitle from '../../hooks/useTitle'
import { useState, useEffect } from "react"
import { useUpdateUserMutation, useDeleteUserMutation } from "../../app/api/usersApiSlice"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { ROLES } from "../../config/roles"

const EditUser = () => {
    useTitle('Kullanıcı Düzenle')

    const { id } = useParams()

    const { user } = useGetUsersQuery("usersList", {
        selectFromResult: ({ data }) => ({
            user: data?.entities[id]
        }),
    })

    if (!user) return <PulseLoader color={"#FFF"} />

    const content = <EditUserForm user={user} />

    return content
}



/* const USER_REGEX = /^[A-z0-9]{3,20}$/
const PWD_REGEX = /^[A-z0-9!@#$%]{4,12}$/ */

const EditUserForm = ({ user }) => {

    const [updateUser, {
        isLoading,
        isSuccess,
        isError,
        error
    }] = useUpdateUserMutation()

    const [deleteUser, {
        isSuccess: isDelSuccess,
        isError: isDelError,
        error: delerror
    }] = useDeleteUserMutation()

    const navigate = useNavigate()

    const [fullName, setFullName] = useState(user.fullName)
    const [username, setUsername] = useState(user.username)
    //const [validUsername, setValidUsername] = useState(false)
    const [password, setPassword] = useState('')
    //const [validPassword, setValidPassword] = useState(false)
    const [roles, setRoles] = useState(user.roles)
    const [active, setActive] = useState(user.active)

    /* useEffect(() => {
        setValidUsername(USER_REGEX.test(username))
    }, [username])

    useEffect(() => {
        setValidPassword(PWD_REGEX.test(password))
    }, [password]) */

    useEffect(() => {
        console.log(isSuccess)
        if (isSuccess || isDelSuccess) {
            setFullName('')
            setUsername('')
            setPassword('')
            setRoles([])
            navigate('/dash/users')
        }

    }, [isSuccess, isDelSuccess, navigate])

    const onFullNameChanged = e => setFullName(e.target.value)
    const onUsernameChanged = e => setUsername(e.target.value)
    const onPasswordChanged = e => setPassword(e.target.value)

    const onRolesChanged = e => {
        const values = Array.from(
            e.target.selectedOptions,
            (option) => option.value
        )
        setRoles(values)
    }

    const onActiveChanged = () => setActive(prev => !prev)

    const onSaveUserClicked = async (e) => {
        if (password) {
            await updateUser({ id: user.id, fullName, username, password, roles, active })
        } else {
            await updateUser({ id: user.id, fullName, username, roles, active })
        }
    }

    const onDeleteUserClicked = async () => {
        await deleteUser({ id: user.id })
    }

    const options = Object.values(ROLES).map(role => {
        return (
            <option
                key={role}
                value={role}

            > {role}</option >
        )
    })

    let canSave
    if (password) {
        canSave = [roles.length].every(Boolean) && !isLoading
    } else {
        canSave = [roles.length].every(Boolean) && !isLoading
    }

    const errClass = (isError || isDelError) ? "errmsg" : "offscreen"
    //const validUserClass = !validUsername ? 'form__input--incomplete' : ''
    //const validPwdClass = password && !validPassword ? 'form__input--incomplete' : ''
    const validRolesClass = !Boolean(roles.length) ? 'form__input--incomplete' : ''

    const errContent = (error?.data?.message || delerror?.data?.message) ?? ''


    const content = (
        <div className='wrapper'>
        <div className="form_wrapper">
            <p className={errClass}>{errContent}</p>

            <form className="form" onSubmit={e => e.preventDefault()} autoComplete="off">
                
                <div className="form__title-row">
                <h2>Kullanıcı Düzenle</h2>                   
                     <div className="form__action-buttons-wrapper">
                        <div className="form__action-buttons">
                            <button
                                className="form__button success__button"
                                title="Save"
                                onClick={onSaveUserClicked}
                                disabled={!canSave}
                            >
                                <FontAwesomeIcon icon={faSave} />
                            </button>
                            <button
                                className="form__button danger__button"
                                title="Delete"
                                onClick={onDeleteUserClicked}
                            >
                                <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                        </div>
                    </div> 
                    
                </div>
                <label className="form__label" htmlFor="fullname">
                    Adı Soyadı:
                </label>
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
                <label className="form__label" htmlFor="username">
                    Kullanıcı Adı
                </label>
                <input
                    className="form__input"
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="off"
                    value={username}
                    onChange={onUsernameChanged}
                />

                <label className="form__label" htmlFor="password">
                    Şifre
                </label>
                <input
                    className="form__input" 
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="off"
                    value={password}
                    onChange={onPasswordChanged}
                />

                <label className="form__label form__checkbox-container" htmlFor="user-active">
                    Aktif Çalışan?
                    <input
                        className="form__checkbox"
                        id="user-active"
                        name="user-active"
                        type="checkbox"
                        checked={active}
                        onChange={onActiveChanged}
                    />
                </label>

                <div className="form-group">
                    <label className="form__label" htmlFor="roles">
                        Roller:</label>
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


export default EditUser