import { Outlet } from 'react-router-dom'
import PublicHeader from './PublicHeader'
import PublicFooter from './PublicFooter'



const Layout = () => { 

    
    return <div className="container">
        <PublicHeader/>
        <Outlet />
        <PublicFooter/>        
    </div>
}
export default Layout