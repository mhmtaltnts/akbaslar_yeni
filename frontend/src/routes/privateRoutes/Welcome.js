import { Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import useTitle from '../../hooks/useTitle'

const Welcome = () => {

    const { username, isManager, isAdmin, status } = useAuth()

    useTitle(`Gebze Konak Parkı: ${username}`)    

    const content = (
        <div className='wrapper'>
            <div className='welcome'>
                <h1>Hoşgeldiniz!</h1>
                {(isManager || isAdmin || status === "Çalışan") && <Link to="/dash/notes/new" className='welcome-link'>Yeni Araç Girişi</Link>}            
                <Link to="/dash/notes" className='welcome-link'>Parkta Mevcut Araçlar</Link>

                {(isManager || isAdmin) && <Link to="/dash/users/new" className='welcome-link'>Yeni Kullanıcı Ekle</Link>}
                {(isManager || isAdmin) && <Link to="/dash/users" className='welcome-link'>Kullanıcılar ve Ayarlar</Link>}

                {(isManager || isAdmin || status === "Çalışan") && <Link to="/dash/rapor" className='welcome-link'>Rapor</Link>}
            </div>
        </div>
    )

    return content
}
export default Welcome