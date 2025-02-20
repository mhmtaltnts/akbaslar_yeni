import { Outlet } from "react-router-dom";
import PublicHeader from "../components/headers/PublicHeader";
import PublicFooter from "../components/footers/PublicFooter";

const Layout = () => {
  return (
    <div className=" bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white min-h-screen">
      <PublicHeader />
      <div className="flex items-start justify-center min-h-[calc(100dvh-theme(--spacing-header)-theme(--spacing-footer))]  ">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
};
export default Layout;
