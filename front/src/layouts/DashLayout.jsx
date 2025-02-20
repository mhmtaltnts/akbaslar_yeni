import { Outlet } from "react-router-dom";
import DashHeader from "../components/headers/DashHeader";

const DashLayout = () => {
  return (
    <div className=" bg-paper text-gray-800 dark:bg-gray-800 dark:text-white min-h-screen">
      <DashHeader />
      <div className="flex justify-center items-start min-h-[calc(100dvh-theme(--spacing-header)-theme(--spacing-footer))]">
        <Outlet />
      </div>
    </div>
  );
};
export default DashLayout;
