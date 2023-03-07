import { useSelector } from 'react-redux'
import { selectCurrentToken } from "../app/appStore/authSlice"
import jwtDecode from 'jwt-decode'

const useAuth = () => {
    const token = useSelector(selectCurrentToken)
    let isManager = false
    let isAdmin = false
    let status = "Çalışan"

    if (token) {
        const decoded = jwtDecode(token)
        const { fullName, username, roles } = decoded.UserInfo

        isManager = roles.includes('Yönetici')
        isAdmin = roles.includes('Kurucu')

        if (isManager) status = "Yönetici"
        if (isAdmin) status = "Kurucu"
        if(roles.includes('Memur')) status = "Memur"
        if(roles.includes('Çalışan')) status = "Çalışan"

        return { fullName, username, roles, status, isManager, isAdmin }
    }

    return { username: '', fullName: "", roles: [], isManager, isAdmin, status }
}
export default useAuth